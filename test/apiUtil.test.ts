import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
	INT32_MAX,
	clientIp,
	intParam,
	prismaErrorResponse,
	rateCount,
	rateLimit,
	readJson,
	resetRateLimits,
	safeInt,
} from '@/lib/apiUtil'

const req = (body: string, contentType = 'application/json') =>
	new Request('http://localhost/x', { method: 'POST', body, headers: { 'content-type': contentType } })

describe('readJson', () => {
	it('объект → объект', async () => {
		expect(await readJson(req('{"a":1}'))).toEqual({ a: 1 })
	})
	it('не JSON → null', async () => {
		expect(await readJson(req('{oops'))).toBeNull()
	})
	it('пустое тело → null', async () => {
		expect(await readJson(req(''))).toBeNull()
	})
	it('null / массив / число / строка → null', async () => {
		expect(await readJson(req('null'))).toBeNull()
		expect(await readJson(req('[1,2]'))).toBeNull()
		expect(await readJson(req('42'))).toBeNull()
		expect(await readJson(req('"str"'))).toBeNull()
	})
	it('повторное чтение уже прочитанного тела → null, а не исключение', async () => {
		const r = req('{"a":1}')
		await r.json()
		expect(await readJson(r)).toBeNull()
	})
})

describe('intParam', () => {
	it('обычное число', () => expect(intParam('3', 1)).toBe(3))
	it('дробь округляется вниз', () => expect(intParam('2.9', 1)).toBe(2))
	it('мусор, пусто и null → fallback', () => {
		expect(intParam('abc', 1)).toBe(1)
		expect(intParam('', 5)).toBe(5)
		expect(intParam('   ', 5)).toBe(5)
		expect(intParam(null, 7)).toBe(7)
		expect(intParam('Infinity', 1)).toBe(1)
		expect(intParam('NaN', 1)).toBe(1)
	})
	it('меньше минимума зажимается к минимуму', () => {
		expect(intParam('0', 1)).toBe(1)
		expect(intParam('-5', 1)).toBe(1)
		expect(intParam('-5', 1, 0)).toBe(0)
	})
	it('больше максимума зажимается к int32', () => {
		expect(intParam('99999999999', 1)).toBe(INT32_MAX)
		expect(intParam('50', 1, 1, 10)).toBe(10)
	})
})

describe('safeInt', () => {
	it('положительные целые', () => {
		expect(safeInt(5)).toBe(5)
		expect(safeInt('3001')).toBe(3001)
		expect(safeInt(' 3001 ')).toBe(3001)
		expect(safeInt(INT32_MAX)).toBe(INT32_MAX)
	})
	it('отклоняет ноль, отрицательные, дроби, NaN, переполнение', () => {
		for (const v of [0, -1, 1.5, NaN, Infinity, INT32_MAX + 1, '0', '-3', '1.5', '1e3', '99999999999', 'abc', '', null, undefined, {}, [], true]) {
			expect(safeInt(v), String(v)).toBeNull()
		}
	})
})

describe('clientIp', () => {
	it('первый адрес из x-forwarded-for', () => {
		expect(clientIp(new Headers({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1' }))).toBe('1.2.3.4')
	})
	it('x-real-ip как запасной', () => {
		expect(clientIp(new Headers({ 'x-real-ip': '5.6.7.8' }))).toBe('5.6.7.8')
	})
	it('нет заголовков → unknown', () => {
		expect(clientIp(new Headers())).toBe('unknown')
	})
	it('работает и с обычным объектом заголовков (NextAuth)', () => {
		expect(clientIp({ 'x-forwarded-for': ['9.9.9.9', 'x'] })).toBe('9.9.9.9')
		expect(clientIp({})).toBe('unknown')
	})
})

describe('prismaErrorResponse', () => {
	it('P2025 → 404, P2002 → 409, P2003 → 400', () => {
		expect(prismaErrorResponse({ code: 'P2025' })?.status).toBe(404)
		expect(prismaErrorResponse({ code: 'P2002' })?.status).toBe(409)
		expect(prismaErrorResponse({ code: 'P2003' })?.status).toBe(400)
	})
	it('остальное → null (пусть падает как раньше)', () => {
		expect(prismaErrorResponse(new Error('x'))).toBeNull()
		expect(prismaErrorResponse({ code: 'P1001' })).toBeNull()
		expect(prismaErrorResponse(null)).toBeNull()
		expect(prismaErrorResponse('P2025')).toBeNull()
	})
})

describe('rateLimit', () => {
	beforeEach(() => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
		resetRateLimits()
	})
	afterEach(() => {
		vi.useRealTimers()
		resetRateLimits()
	})

	it('пропускает до лимита включительно, дальше отказ с retryAfter', () => {
		for (let i = 0; i < 3; i++) expect(rateLimit('k', 3, 60_000).ok).toBe(true)
		const r = rateLimit('k', 3, 60_000)
		expect(r.ok).toBe(false)
		expect(r.retryAfter).toBeGreaterThanOrEqual(1)
		expect(r.retryAfter).toBeLessThanOrEqual(60)
	})

	it('окно скользящее: после его истечения снова можно', () => {
		for (let i = 0; i < 4; i++) rateLimit('k', 3, 60_000)
		expect(rateLimit('k', 3, 60_000).ok).toBe(false)
		vi.advanceTimersByTime(60_001)
		expect(rateLimit('k', 3, 60_000).ok).toBe(true)
	})

	it('ключи независимы', () => {
		for (let i = 0; i < 5; i++) rateLimit('a', 3, 60_000)
		expect(rateLimit('a', 3, 60_000).ok).toBe(false)
		expect(rateLimit('b', 3, 60_000).ok).toBe(true)
	})

	it('retryAfter уменьшается со временем', () => {
		for (let i = 0; i < 4; i++) rateLimit('k', 3, 60_000)
		const first = rateLimit('k', 3, 60_000).retryAfter
		vi.advanceTimersByTime(30_000)
		const later = rateLimit('k', 3, 60_000).retryAfter
		expect(later).toBeLessThan(first)
	})

	it('rateCount не записывает событие', () => {
		rateLimit('k', 3, 60_000)
		expect(rateCount('k', 60_000)).toBe(1)
		expect(rateCount('k', 60_000)).toBe(1)
		vi.advanceTimersByTime(60_001)
		expect(rateCount('k', 60_000)).toBe(0)
	})
})
