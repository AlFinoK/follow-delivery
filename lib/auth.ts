// Единая конфигурация NextAuth и проверка сессии в API-роутах. Только сервер.
//
// authOptions живёт здесь, а не в route-файле, чтобы getServerSession(authOptions) во
// всех роутах и сам обработчик /api/auth читали одни и те же настройки (callbacks,
// maxAge и т.п.): раньше getServerSession() вызывался без аргументов и «работал» лишь
// потому, что в настройках не было ничего, влияющего на сессию.

import { createHash, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getServerSession, type NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { clientIp, rateCount, rateHit } from './apiUtil'
import { LOGIN_LOCKED } from './authCodes'

/** Сколько неудачных попыток входа с одного IP за окно, прежде чем вход блокируется. */
export const LOGIN_MAX_FAILS_PER_IP = 5
/** То же, но суммарно по всем IP — защита от перебора с ротацией адресов (на один инстанс). */
export const LOGIN_MAX_FAILS_GLOBAL = 30
export const LOGIN_WINDOW_MS = 15 * 60 * 1000

/** Сравнение постоянного времени: хэшируем, чтобы длины совпали и не утекали. */
function safeEqual(a: string, b: string): boolean {
	const ha = createHash('sha256').update(a).digest()
	const hb = createHash('sha256').update(b).digest()
	return timingSafeEqual(ha, hb)
}

export const authOptions: NextAuthOptions = {
	providers: [
		CredentialsProvider({
			name: 'credentials',
			credentials: {
				username: { label: 'Логин', type: 'text' },
				password: { label: 'Пароль', type: 'password' },
			},
			async authorize(credentials, req) {
				const wantUser = process.env.ADMIN_USERNAME
				const wantPass = process.env.ADMIN_PASSWORD
				// Не настроено — вход закрыт. Раньше `undefined === undefined` пускал любого
				// без логина и пароля, а пустая строка в env — любого с пустой формой.
				if (!wantUser || !wantPass) {
					console.error('[auth] ADMIN_USERNAME/ADMIN_PASSWORD не заданы — вход отключён')
					return null
				}

				const ip = clientIp((req?.headers ?? {}) as Record<string, string | string[] | undefined>)
				const ipKey = `login-fail:${ip}`
				const globalKey = 'login-fail:*'
				if (
					rateCount(ipKey, LOGIN_WINDOW_MS) >= LOGIN_MAX_FAILS_PER_IP ||
					rateCount(globalKey, LOGIN_WINDOW_MS) >= LOGIN_MAX_FAILS_GLOBAL
				) {
					// Не null, а ошибка с кодом: клиент покажет «слишком много попыток», а не
					// «неверный пароль» (см. lib/authCodes.ts). Пароль при этом не проверяется.
					throw new Error(LOGIN_LOCKED)
				}

				const user = typeof credentials?.username === 'string' ? credentials.username : ''
				const pass = typeof credentials?.password === 'string' ? credentials.password : ''
				// Оба сравнения выполняем всегда: по времени не видно, что именно не совпало.
				const userOk = safeEqual(user, wantUser)
				const passOk = safeEqual(pass, wantPass)
				if (userOk && passOk) return { id: '1', name: 'Admin' }

				rateHit(ipKey, LOGIN_WINDOW_MS)
				rateHit(globalKey, LOGIN_WINDOW_MS)
				return null
			},
		}),
	],
	pages: { signIn: '/login' },
	session: { strategy: 'jwt' },
}

/** Сессия админа или null. */
export function getSession() {
	return getServerSession(authOptions)
}

/** Для начала обработчика: ответ 401, если нет сессии, иначе null. */
export async function requireAuth(): Promise<NextResponse | null> {
	const session = await getSession()
	if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	return null
}
