// Общие помощники для API-роутов: безопасный разбор тела, разбор числовых параметров,
// перевод ошибок Prisma в HTTP-коды и грубый лимитер запросов.
// Только сервер.

import { NextResponse } from 'next/server'

/** Максимум Int в PostgreSQL (int32): всё, что больше, Prisma отвергает ошибкой → 500. */
export const INT32_MAX = 2147483647

export function badRequest(message: string) {
	return NextResponse.json({ error: message }, { status: 400 })
}

/**
 * Тело запроса как объект. null — тело не JSON, либо JSON, но не объект (`null`, массив,
 * число). Голый `await req.json()` в таких случаях бросает исключение → 500 вместо 400.
 */
export async function readJson(req: Request): Promise<Record<string, unknown> | null> {
	try {
		const body: unknown = await req.json()
		return body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : null
	} catch {
		return null
	}
}

/**
 * Целое из строки запроса (`?page=`, …) в пределах [min, max]. Мусор, дробь и выход за
 * границы дают `fallback`/зажим, а не исключение: `?page=1.3` раньше давал дробный
 * `skip`, который Prisma отвергает.
 */
export function intParam(value: string | null, fallback: number, min = 1, max = INT32_MAX): number {
	if (value === null || value.trim() === '') return fallback
	const n = Number(value)
	if (!Number.isFinite(n)) return fallback
	return Math.min(max, Math.max(min, Math.floor(n)))
}

/**
 * Целое, которое влезет в колонку Int (положительное, ≤ int32). null — не подходит.
 * Для номеров, которые приходят из поиска/тела и идут прямо в `where`/`data`.
 */
export function safeInt(value: unknown): number | null {
	const n = typeof value === 'number' ? value : typeof value === 'string' && /^\d+$/.test(value.trim()) ? Number(value) : NaN
	return Number.isInteger(n) && n > 0 && n <= INT32_MAX ? n : null
}

/**
 * Ошибки Prisma, которые означают «клиент ошибся», а не «сервер сломался»:
 *   P2025 — запись не найдена (update/delete по несуществующему id) → 404;
 *   P2002 — нарушение уникальности → 409;
 *   P2003 — нарушение внешнего ключа (несуществующая ссылка) → 400.
 * Остальное → null: пусть падает как раньше и попадает в лог.
 */
export function prismaErrorResponse(e: unknown): NextResponse | null {
	const code = typeof e === 'object' && e && 'code' in e ? String((e as { code: unknown }).code) : ''
	if (code === 'P2025') return NextResponse.json({ error: 'Not found' }, { status: 404 })
	if (code === 'P2002') return NextResponse.json({ error: 'Уже существует' }, { status: 409 })
	if (code === 'P2003') return NextResponse.json({ error: 'Связанная запись не найдена' }, { status: 400 })
	return null
}

/** IP клиента из заголовков прокси (Vercel ставит x-forwarded-for). */
export function clientIp(headers: Headers | Record<string, string | string[] | undefined>): string {
	const get = (name: string) => {
		if (typeof (headers as Headers).get === 'function') return (headers as Headers).get(name) ?? ''
		const v = (headers as Record<string, string | string[] | undefined>)[name]
		return Array.isArray(v) ? (v[0] ?? '') : (v ?? '')
	}
	return (get('x-forwarded-for').split(',')[0] || get('x-real-ip') || 'unknown').trim() || 'unknown'
}

// ── Лимитер ─────────────────────────────────────────────────────────────────────
// ⚠️ В памяти процесса: на Vercel каждый инстанс функции считает сам по себе, и после
// холодного старта счётчик обнуляется. Это ГРУБАЯ защита от перебора, а не гарантия:
// она режет скрипт, бьющий в один инстанс, но не распределённую атаку. Для строгого
// лимита нужно общее хранилище (Redis/БД).

const buckets = new Map<string, number[]>()
const MAX_KEYS = 5000

function prune(key: string, windowMs: number, now: number): number[] {
	const fresh = (buckets.get(key) ?? []).filter((t) => now - t < windowMs)
	if (fresh.length) buckets.set(key, fresh)
	else buckets.delete(key)
	return fresh
}

/** Сколько событий по ключу за последнее окно (ничего не записывает). */
export function rateCount(key: string, windowMs: number): number {
	return prune(key, windowMs, Date.now()).length
}

/** Записать событие по ключу; вернуть, сколько их теперь в окне. */
export function rateHit(key: string, windowMs: number): number {
	const now = Date.now()
	if (buckets.size > MAX_KEYS) {
		// Защита памяти от перебора ключей: выбрасываем самые старые.
		for (const k of buckets.keys()) {
			buckets.delete(k)
			if (buckets.size <= MAX_KEYS / 2) break
		}
	}
	const list = prune(key, windowMs, now)
	list.push(now)
	buckets.set(key, list)
	return list.length
}

/** Записать обращение и сказать, укладывается ли оно в лимит. retryAfter — секунды. */
export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
	const n = rateHit(key, windowMs)
	if (n <= limit) return { ok: true, retryAfter: 0 }
	const oldest = buckets.get(key)?.[0] ?? Date.now()
	return { ok: false, retryAfter: Math.max(1, Math.ceil((oldest + windowMs - Date.now()) / 1000)) }
}

/** Только для тестов. */
export function resetRateLimits() {
	buckets.clear()
}
