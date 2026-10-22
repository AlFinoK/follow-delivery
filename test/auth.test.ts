import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// getServerSession нам не нужен — проверяем authorize, а не сессию.
vi.mock('next-auth', async (orig) => ({ ...(await orig<typeof import('next-auth')>()), getServerSession: vi.fn() }))

import { LOGIN_MAX_FAILS_GLOBAL, LOGIN_MAX_FAILS_PER_IP, LOGIN_WINDOW_MS, authOptions } from '@/lib/auth'
import { resetRateLimits } from '@/lib/apiUtil'
import { LOGIN_LOCKED } from '@/lib/authCodes'

type Authorize = (
	credentials: Record<string, string> | undefined,
	req: { headers: Record<string, string> },
) => Promise<{ id: string; name: string } | null>

// В next-auth v4 пользовательские опции провайдера лежат в `.options`.
const authorize = (authOptions.providers[0] as unknown as { options: { authorize: Authorize } }).options.authorize

const reqFrom = (ip: string) => ({ headers: { 'x-forwarded-for': ip } })
const OK = { username: 'boss', password: 's3cret-Pass' }
const BAD = { username: 'boss', password: 'wrong' }

const saved = { u: process.env.ADMIN_USERNAME, p: process.env.ADMIN_PASSWORD }

beforeEach(() => {
	vi.useFakeTimers()
	vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
	resetRateLimits()
	vi.spyOn(console, 'error').mockImplementation(() => {})
	process.env.ADMIN_USERNAME = 'boss'
	process.env.ADMIN_PASSWORD = 's3cret-Pass'
})

afterEach(() => {
	vi.useRealTimers()
	vi.restoreAllMocks()
	resetRateLimits()
	if (saved.u === undefined) delete process.env.ADMIN_USERNAME
	else process.env.ADMIN_USERNAME = saved.u
	if (saved.p === undefined) delete process.env.ADMIN_PASSWORD
	else process.env.ADMIN_PASSWORD = saved.p
})

describe('authorize: env не задан — вход закрыт', () => {
	beforeEach(() => {
		delete process.env.ADMIN_USERNAME
		delete process.env.ADMIN_PASSWORD
	})

	it('пустые учётные данные → null (раньше undefined === undefined пускал)', async () => {
		expect(await authorize({ username: '', password: '' }, reqFrom('1.1.1.1'))).toBeNull()
	})
	it('отсутствующие поля / нет credentials → null', async () => {
		expect(await authorize({} as Record<string, string>, reqFrom('1.1.1.1'))).toBeNull()
		expect(await authorize(undefined, reqFrom('1.1.1.1'))).toBeNull()
	})
	it('даже «какие-то» данные не проходят', async () => {
		expect(await authorize({ username: 'boss', password: 'x' }, reqFrom('1.1.1.1'))).toBeNull()
	})
})

describe('authorize: env равен пустой строке', () => {
	it('оба пустые → null и для пустой формы, и для непустой', async () => {
		process.env.ADMIN_USERNAME = ''
		process.env.ADMIN_PASSWORD = ''
		expect(await authorize({ username: '', password: '' }, reqFrom('1.1.1.1'))).toBeNull()
		expect(await authorize(OK, reqFrom('1.1.1.1'))).toBeNull()
	})
	it('пустой только пароль → null', async () => {
		process.env.ADMIN_PASSWORD = ''
		expect(await authorize({ username: 'boss', password: '' }, reqFrom('1.1.1.1'))).toBeNull()
	})
})

describe('authorize: env задан', () => {
	it('верные данные → пользователь', async () => {
		expect(await authorize(OK, reqFrom('2.2.2.2'))).toEqual({ id: '1', name: 'Admin' })
	})
	it('неверный пароль / логин / пустые поля → null', async () => {
		expect(await authorize(BAD, reqFrom('2.2.2.2'))).toBeNull()
		expect(await authorize({ username: 'nobody', password: OK.password }, reqFrom('2.2.2.2'))).toBeNull()
		expect(await authorize({ username: '', password: '' }, reqFrom('2.2.2.2'))).toBeNull()
		expect(await authorize({} as Record<string, string>, reqFrom('2.2.2.2'))).toBeNull()
	})
	it('пароль, отличающийся длиной/префиксом, не проходит', async () => {
		expect(await authorize({ username: 'boss', password: OK.password + 'x' }, reqFrom('2.2.2.2'))).toBeNull()
		expect(await authorize({ username: 'boss', password: OK.password.slice(0, -1) }, reqFrom('2.2.2.2'))).toBeNull()
	})
	it('без заголовков (req не передан) работает: IP = unknown', async () => {
		expect(await authorize(OK, undefined as unknown as { headers: Record<string, string> })).toEqual({ id: '1', name: 'Admin' })
	})
})

describe('authorize: блокировка перебора', () => {
	// Во время блокировки authorize бросает ошибку с кодом LOGIN_LOCKED (NextAuth отдаёт
	// её клиенту как signIn().error), а не возвращает null, как при неверном пароле.
	const locked = (ip: string) => expect(authorize(OK, reqFrom(ip))).rejects.toThrow(LOGIN_LOCKED)

	it('после LOGIN_MAX_FAILS_PER_IP неудач верный пароль с того же IP отклоняется кодом LOGIN_LOCKED', async () => {
		for (let i = 0; i < LOGIN_MAX_FAILS_PER_IP; i++) {
			expect(await authorize(BAD, reqFrom('3.3.3.3'))).toBeNull()
		}
		await locked('3.3.3.3')
	})

	it('до порога верный пароль ещё проходит', async () => {
		for (let i = 0; i < LOGIN_MAX_FAILS_PER_IP - 1; i++) await authorize(BAD, reqFrom('3.3.3.3'))
		expect(await authorize(OK, reqFrom('3.3.3.3'))).toEqual({ id: '1', name: 'Admin' })
	})

	it('блокировка снимается, когда окно прошло', async () => {
		for (let i = 0; i < LOGIN_MAX_FAILS_PER_IP; i++) await authorize(BAD, reqFrom('3.3.3.3'))
		await locked('3.3.3.3')
		vi.advanceTimersByTime(LOGIN_WINDOW_MS + 1000)
		expect(await authorize(OK, reqFrom('3.3.3.3'))).toEqual({ id: '1', name: 'Admin' })
	})

	it('отклонённые во время блокировки попытки окно не продлевают', async () => {
		for (let i = 0; i < LOGIN_MAX_FAILS_PER_IP; i++) await authorize(BAD, reqFrom('3.3.3.3'))
		vi.advanceTimersByTime(LOGIN_WINDOW_MS - 1000)
		await locked('3.3.3.3') // заблокирован, но не записывается как новая неудача
		vi.advanceTimersByTime(2000)
		expect(await authorize(OK, reqFrom('3.3.3.3'))).toEqual({ id: '1', name: 'Admin' })
	})

	it('другой IP не затронут, пока не исчерпан общий лимит', async () => {
		for (let i = 0; i < LOGIN_MAX_FAILS_PER_IP; i++) await authorize(BAD, reqFrom('3.3.3.3'))
		await locked('3.3.3.3')
		expect(await authorize(OK, reqFrom('4.4.4.4'))).toEqual({ id: '1', name: 'Admin' })
	})

	it('общий лимит: перебор с ротацией IP блокирует вход со всех адресов', async () => {
		// каждый «злоумышленник» делает по одной неудаче, т.е. по-IP лимит не срабатывает
		for (let i = 0; i < LOGIN_MAX_FAILS_GLOBAL; i++) {
			expect(await authorize(BAD, reqFrom(`10.0.${Math.floor(i / 250)}.${i % 250}`))).toBeNull()
		}
		await locked('77.77.77.77')
		vi.advanceTimersByTime(LOGIN_WINDOW_MS + 1000)
		expect(await authorize(OK, reqFrom('77.77.77.77'))).toEqual({ id: '1', name: 'Admin' })
	})
})
