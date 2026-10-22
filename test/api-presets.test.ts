import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { SESSION, TEST_DB_URL, getReq, idParams, jsonReq, useTestDatabase } from './helpers/db'

const h = vi.hoisted(() => ({ session: null as unknown }))
vi.mock('next-auth', async (orig) => ({
	...(await orig<typeof import('next-auth')>()),
	getServerSession: vi.fn(async () => h.session),
}))

// ⚠️ Этот файл — единственный, кто трогает CargoPreset, и он ЧИСТИТ таблицу целиком.
// Поэтому только тестовая БД (useTestDatabase проверяет, что хост локальный).
describe.skipIf(!TEST_DB_URL)('API /api/presets (БД)', () => {
	type Prisma = typeof import('@/lib/prisma').prisma
	let prisma: Prisma
	let route: typeof import('@/app/api/presets/route')
	let idRoute: typeof import('@/app/api/presets/[id]/route')
	let seed: typeof import('@/app/api/presets/seed/route')
	let DEFAULT_PRESETS: typeof import('@/lib/calculator/presets').DEFAULT_PRESETS

	beforeAll(async () => {
		useTestDatabase()
		prisma = (await import('@/lib/prisma')).prisma
		route = await import('@/app/api/presets/route')
		idRoute = await import('@/app/api/presets/[id]/route')
		seed = await import('@/app/api/presets/seed/route')
		DEFAULT_PRESETS = (await import('@/lib/calculator/presets')).DEFAULT_PRESETS
	})

	beforeEach(async () => {
		h.session = SESSION
		await prisma.cargoPreset.deleteMany({})
	})

	afterAll(async () => {
		await prisma.cargoPreset.deleteMany({})
		await prisma.$disconnect()
	})

	const body = (extra: Record<string, unknown> = {}) => ({ name: 'Тестовый', length: 100, width: 50, height: 50, weight: 200, ...extra })

	it('без сессии: GET ?all=1, POST, PATCH, DELETE, seed → 401', async () => {
		h.session = null
		expect((await route.GET(getReq('/api/presets?all=1'))).status).toBe(401)
		expect((await route.POST(jsonReq('/api/presets', 'POST', body()))).status).toBe(401)
		expect((await idRoute.PATCH(jsonReq('/x', 'PATCH', { name: 'x' }), idParams('id'))).status).toBe(401)
		expect((await idRoute.DELETE(getReq('/x'), idParams('id'))).status).toBe(401)
		expect((await seed.POST(jsonReq('/api/presets/seed', 'POST'))).status).toBe(401)
	})

	it('публичный GET не отдаёт себестоимость, авторизованный — отдаёт; скрытые только по ?all=1', async () => {
		await prisma.cargoPreset.create({ data: { name: 'A', length: 1, width: 1, height: 1, weight: 1, goodsPrice: 777 } })
		await prisma.cargoPreset.create({ data: { name: 'B', length: 1, width: 1, height: 1, weight: 1, active: false } })
		h.session = null
		const pub = await (await route.GET(getReq('/api/presets'))).json()
		expect(pub.map((p: { name: string }) => p.name)).toEqual(['A'])
		expect(pub[0].goodsPrice).toBe(0)
		h.session = SESSION
		expect((await (await route.GET(getReq('/api/presets'))).json())[0].goodsPrice).toBe(777)
		expect(await (await route.GET(getReq('/api/presets?all=1'))).json()).toHaveLength(2)
	})

	it('POST: создание, битое тело → 400, дробный/огромный sortOrder → 400', async () => {
		const ok = await route.POST(jsonReq('/api/presets', 'POST', body({ sortOrder: 3 })))
		expect(ok.status).toBe(201)
		const broken = await route.POST(jsonReq('/api/presets', 'POST', '{oops'))
		expect(broken.status).toBe(400)
		expect((await broken.json()).error).toBe('Некорректное тело запроса')
		for (const sortOrder of [1.5, 99999999999, 'abc']) {
			expect((await route.POST(jsonReq('/api/presets', 'POST', body({ sortOrder })))).status, String(sortOrder)).toBe(400)
		}
	})

	it('PATCH/DELETE несуществующего шаблона → 404 (P2025), а не 500', async () => {
		expect((await idRoute.PATCH(jsonReq('/x', 'PATCH', { name: 'x' }), idParams('no-such'))).status).toBe(404)
		expect((await idRoute.DELETE(getReq('/x'), idParams('no-such'))).status).toBe(404)
	})

	it('PATCH: битое тело → 400, дробный sortOrder → 400, успешное обновление', async () => {
		const p = await prisma.cargoPreset.create({ data: { name: 'A', length: 1, width: 1, height: 1, weight: 1 } })
		expect((await idRoute.PATCH(jsonReq('/x', 'PATCH', 'null'), idParams(p.id))).status).toBe(400)
		expect((await idRoute.PATCH(jsonReq('/x', 'PATCH', { sortOrder: 2.5 }), idParams(p.id))).status).toBe(400)
		const ok = await idRoute.PATCH(jsonReq('/x', 'PATCH', { name: 'Новое', goodsPrice: 5 }), idParams(p.id))
		expect((await ok.json()).name).toBe('Новое')
	})

	describe('seed', () => {
		it('в пустую таблицу заливает стандартные; повторно без force — не трогает', async () => {
			const first = await (await seed.POST(jsonReq('/api/presets/seed', 'POST'))).json()
			expect(first.seeded).toBe(DEFAULT_PRESETS.length)
			const again = await (await seed.POST(jsonReq('/api/presets/seed', 'POST'))).json()
			expect(again.seeded).toBe(0)
			expect(await prisma.cargoPreset.count()).toBe(DEFAULT_PRESETS.length)
		})

		it('?force=1 сохраняет себестоимость (goodsPrice) по названию шаблона', async () => {
			await seed.POST(jsonReq('/api/presets/seed', 'POST'))
			const name = DEFAULT_PRESETS[0].name
			await prisma.cargoPreset.updateMany({ where: { name }, data: { goodsPrice: 4_500_000 } })

			const res = await seed.POST(jsonReq('/api/presets/seed?force=1', 'POST'))
			expect((await res.json()).seeded).toBe(DEFAULT_PRESETS.length)
			expect(await prisma.cargoPreset.count()).toBe(DEFAULT_PRESETS.length)
			expect((await prisma.cargoPreset.findFirst({ where: { name } }))?.goodsPrice).toBe(4_500_000)
			// остальным остаётся 0
			expect(await prisma.cargoPreset.count({ where: { goodsPrice: { gt: 0 } } })).toBe(1)
		})

		it('?force=1 атомарен: сбой вставки откатывает удаление, таблица не остаётся пустой', async () => {
			await seed.POST(jsonReq('/api/presets/seed', 'POST'))
			const before = await prisma.cargoPreset.count()
			expect(before).toBeGreaterThan(0)
			// Ломаем вставку: createMany внутри транзакции падает.
			const spy = vi.spyOn(prisma.cargoPreset, 'createMany').mockRejectedValueOnce(new Error('boom'))
			// $transaction передаёт в колбэк отдельный tx-клиент, а не prisma.cargoPreset — подменяем на нём.
			const origTx = prisma.$transaction.bind(prisma) as (fn: (tx: unknown) => unknown) => unknown
			type Tx = { cargoPreset: { createMany: () => Promise<unknown> } }
			const txSpy = vi.spyOn(prisma, '$transaction').mockImplementation(((fn: (tx: Tx) => unknown) =>
				origTx((tx) => {
					;(tx as Tx).cargoPreset.createMany = () => Promise.reject(new Error('boom'))
					return fn(tx as Tx)
				})) as never)
			await expect(seed.POST(jsonReq('/api/presets/seed?force=1', 'POST'))).rejects.toThrow('boom')
			txSpy.mockRestore()
			spy.mockRestore()
			expect(await prisma.cargoPreset.count()).toBe(before)
		})
	})
})
