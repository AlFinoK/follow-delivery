// Общие помощники для тестов, которым нужна настоящая БД.
//
// ⚠️ БД-тесты включаются ТОЛЬКО переменной TEST_DATABASE_URL (describe.skipIf) — без неё
// обычный `npm test` проходит без базы. Хост обязан быть локальным: тест пишет в таблицы и
// чистит их, поэтому на боевую базу он попасть не должен ни при какой ошибке в env.
import { NextRequest } from 'next/server'

export const TEST_DB_URL = process.env.TEST_DATABASE_URL

/** Подменить DATABASE_URL на тестовую БД (ДО импорта lib/prisma) и проверить, что она локальная. */
export function useTestDatabase(): void {
	if (!TEST_DB_URL) return
	const host = new URL(TEST_DB_URL).hostname
	if (host !== '127.0.0.1' && host !== 'localhost') {
		throw new Error(`TEST_DATABASE_URL должен указывать на localhost, а не на ${host}`)
	}
	process.env.DATABASE_URL = TEST_DB_URL
	// `DIRECT_URL`/`DEPLOY_MIGRATE_DB_URL` тесту не нужны и не должны уводить Prisma в сторону.
	delete process.env.DIRECT_URL
}

/** Сессия для getServerSession (мок next-auth создаётся в самом тесте через vi.hoisted). */
export const SESSION = { user: { name: 'Admin' } }

let seq = 0
/** Уникальный префикс данных теста: файлы гоняются параллельно в одной БД и не должны мешать друг другу. */
export const uniquePrefix = (tag: string) => `T${tag}${Date.now().toString(36)}${(seq++).toString(36)}`.toUpperCase()

export function jsonReq(url: string, method: string, body?: unknown, headers: Record<string, string> = {}) {
	return new NextRequest(`http://localhost${url}`, {
		method,
		headers: { 'content-type': 'application/json', ...headers },
		body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
	})
}

export const getReq = (url: string, headers: Record<string, string> = {}) =>
	new NextRequest(`http://localhost${url}`, { method: 'GET', headers })

export const idParams = (id: string) => ({ params: Promise.resolve({ id }) })
