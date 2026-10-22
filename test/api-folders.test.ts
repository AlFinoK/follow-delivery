import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { SESSION, TEST_DB_URL, getReq, idParams, jsonReq, uniquePrefix, useTestDatabase } from './helpers/db'

const h = vi.hoisted(() => ({ session: null as unknown }))
vi.mock('next-auth', async (orig) => ({
	...(await orig<typeof import('next-auth')>()),
	getServerSession: vi.fn(async () => h.session),
}))

describe.skipIf(!TEST_DB_URL)('API /api/folders (БД)', () => {
	type Prisma = typeof import('@/lib/prisma').prisma
	let prisma: Prisma
	let listRoute: typeof import('@/app/api/folders/route')
	let folderRoute: typeof import('@/app/api/folders/[id]/route')
	let cargosRoute: typeof import('@/app/api/folders/[id]/cargos/route')

	const P = uniquePrefix('FD')
	// Диапазон cargoNumber этого файла — 600000+ (api-cargos занимает 500000+).
	let nextNum = 600000
	const num = () => ++nextNum

	const mkFolder = (suffix: string) => prisma.folder.create({ data: { name: `${P}-${suffix}` } })
	const mkCargo = (suffix: string, extra: Record<string, unknown> = {}) =>
		prisma.cargo.create({
			data: { trackingId: `CARGO-${P}-${suffix}`, fromCity: 'Алматы', currentCity: 'Алматы', toCity: 'Москва', cargoNumber: num(), ...extra },
		})

	beforeAll(async () => {
		useTestDatabase()
		prisma = (await import('@/lib/prisma')).prisma
		listRoute = await import('@/app/api/folders/route')
		folderRoute = await import('@/app/api/folders/[id]/route')
		cargosRoute = await import('@/app/api/folders/[id]/cargos/route')
	})

	beforeEach(() => {
		h.session = SESSION
	})

	afterAll(async () => {
		await prisma.cargo.deleteMany({ where: { trackingId: { startsWith: `CARGO-${P}` } } })
		await prisma.folder.deleteMany({ where: { name: { startsWith: P } } })
		await prisma.$disconnect()
	})

	describe('без сессии каждый обработчик отвечает 401 (не полагаемся на middleware)', () => {
		it('GET/POST /api/folders', async () => {
			h.session = null
			expect((await listRoute.GET()).status).toBe(401)
			expect((await listRoute.POST(jsonReq('/api/folders', 'POST', { name: 'x' }))).status).toBe(401)
		})
		it('GET/PATCH/DELETE /api/folders/[id]', async () => {
			const f = await mkFolder('auth')
			h.session = null
			expect((await folderRoute.GET(getReq('/x'), idParams(f.id))).status).toBe(401)
			expect((await folderRoute.PATCH(jsonReq('/x', 'PATCH', { name: 'x' }), idParams(f.id))).status).toBe(401)
			expect((await folderRoute.DELETE(getReq('/x'), idParams(f.id))).status).toBe(401)
			expect(await prisma.folder.findUnique({ where: { id: f.id } })).not.toBeNull()
		})
		it('POST/PATCH /api/folders/[id]/cargos', async () => {
			const f = await mkFolder('auth2')
			const c = await mkCargo('auth2')
			h.session = null
			expect((await cargosRoute.POST(jsonReq('/x', 'POST', { numbers: [c.cargoNumber] }), idParams(f.id))).status).toBe(401)
			expect((await cargosRoute.PATCH(jsonReq('/x', 'PATCH', { currentCity: 'Астана' }), idParams(f.id))).status).toBe(401)
			expect((await prisma.cargo.findUnique({ where: { id: c.id } }))?.folderId).toBeNull()
		})
	})

	describe('папки: создание, переименование, удаление', () => {
		it('создание: ок / пустое имя / битое тело', async () => {
			const ok = await listRoute.POST(jsonReq('/api/folders', 'POST', { name: `  ${P}-new  ` }))
			expect(ok.status).toBe(201)
			expect((await ok.json()).name).toBe(`${P}-new`)
			expect((await listRoute.POST(jsonReq('/api/folders', 'POST', { name: '   ' }))).status).toBe(400)
			const broken = await listRoute.POST(jsonReq('/api/folders', 'POST', '{oops'))
			expect(broken.status).toBe(400)
			expect((await broken.json()).error).toBe('Некорректное тело запроса')
			expect((await listRoute.POST(jsonReq('/api/folders', 'POST', 'null'))).status).toBe(400)
		})

		it('PATCH/DELETE несуществующей папки → 404 (P2025), а не 500', async () => {
			expect((await folderRoute.PATCH(jsonReq('/x', 'PATCH', { name: 'x' }), idParams('no-such'))).status).toBe(404)
			expect((await folderRoute.DELETE(getReq('/x'), idParams('no-such'))).status).toBe(404)
		})

		it('переименование и удаление существующей', async () => {
			const f = await mkFolder('ren')
			const r = await folderRoute.PATCH(jsonReq('/x', 'PATCH', { name: `${P}-renamed` }), idParams(f.id))
			expect((await r.json()).name).toBe(`${P}-renamed`)
			expect((await folderRoute.PATCH(jsonReq('/x', 'PATCH', '{oops'), idParams(f.id))).status).toBe(400)
			expect((await folderRoute.DELETE(getReq('/x'), idParams(f.id))).status).toBe(200)
		})
	})

	describe('GET /api/folders/[id]: пагинация', () => {
		it('page зажимается до последней страницы и возвращается реально использованная', async () => {
			const f = await mkFolder('pg')
			for (let i = 0; i < 21; i++) await mkCargo(`PG${i}`, { folderId: f.id })

			const p1 = await (await folderRoute.GET(getReq('/x?tab=all&page=1'), idParams(f.id))).json()
			expect(p1.page).toBe(1)
			expect(p1.items).toHaveLength(20)
			expect(p1.total).toBe(21)

			const far = await (await folderRoute.GET(getReq('/x?tab=all&page=500'), idParams(f.id))).json()
			expect(far.page).toBe(2)
			expect(far.items).toHaveLength(1)
		})

		it('мусорный page → 200 (дробный, отрицательный, огромный, текст)', async () => {
			const f = await mkFolder('pg2')
			await mkCargo('PGX',{ folderId: f.id })
			for (const bad of ['1.5', '-1', '0', 'abc', '99999999999999999999']) {
				const res = await folderRoute.GET(getReq(`/x?page=${bad}`), idParams(f.id))
				expect(res.status, bad).toBe(200)
				expect((await res.json()).page, bad).toBe(1)
			}
		})

		it('пустая папка и несуществующая папка', async () => {
			const f = await mkFolder('empty')
			const body = await (await folderRoute.GET(getReq('/x?page=9'), idParams(f.id))).json()
			expect(body.total).toBe(0)
			expect(body.page).toBe(1)
			expect((await folderRoute.GET(getReq('/x'), idParams('no-such'))).status).toBe(404)
		})
	})

	describe('POST /api/folders/[id]/cargos: добавление по номерам', () => {
		it('принимает числа, строки, «№3001», «№ 3001» и пробелы', async () => {
			const f = await mkFolder('add')
			const [a, b, c, d] = await Promise.all([mkCargo('A'), mkCargo('B'), mkCargo('C'), mkCargo('D')])
			const res = await cargosRoute.POST(
				jsonReq('/x', 'POST', { numbers: [a.cargoNumber, `${b.cargoNumber}`, `№${c.cargoNumber}`, `№ ${d.cargoNumber}  `, `  ${a.cargoNumber}`] }),
				idParams(f.id),
			)
			expect(res.status).toBe(200)
			const body = await res.json()
			expect([...body.added].sort()).toEqual([a.cargoNumber, b.cargoNumber, c.cargoNumber, d.cargoNumber].sort())
			expect(body.notFound).toEqual([])
			const inFolder = await prisma.cargo.count({ where: { folderId: f.id } })
			expect(inFolder).toBe(4)
		})

		it('число за пределами int32 и мусор → не 500: в notFound не попадают, список пуст → 400', async () => {
			const f = await mkFolder('bad')
			const onlyBad = await cargosRoute.POST(jsonReq('/x', 'POST', { numbers: [99999999999, '99999999999', 'abc', 1.5, -2, 0, null] }), idParams(f.id))
			expect(onlyBad.status).toBe(400)
			const c = await mkCargo('MIXED')
			const mixed = await cargosRoute.POST(jsonReq('/x', 'POST', { numbers: [99999999999, c.cargoNumber, 'abc'] }), idParams(f.id))
			expect(mixed.status).toBe(200)
			expect((await mixed.json()).added).toEqual([c.cargoNumber])
		})

		it('несуществующий номер → notFound; доставленные и уже лежащие в папке — отдельно', async () => {
			const f = await mkFolder('cls')
			const other = await mkFolder('cls-other')
			const arrived = await mkCargo('ARR', { status: 'прибыл' })
			const inside = await mkCargo('IN', { folderId: f.id })
			const moved = await mkCargo('MV', { folderId: other.id })
			const missing = num()
			const res = await cargosRoute.POST(
				jsonReq('/x', 'POST', { numbers: [arrived.cargoNumber, inside.cargoNumber, moved.cargoNumber, missing] }),
				idParams(f.id),
			)
			const body = await res.json()
			expect(body.alreadyDelivered).toEqual([arrived.cargoNumber])
			expect(body.alreadyInFolder).toEqual([inside.cargoNumber])
			expect(body.movedFromOtherFolder).toEqual([moved.cargoNumber])
			expect(body.added).toEqual([moved.cargoNumber])
			expect(body.notFound).toEqual([missing])
		})

		it('несуществующая папка → 404; битое тело → 400; пустой список → 400', async () => {
			expect((await cargosRoute.POST(jsonReq('/x', 'POST', { numbers: [1] }), idParams('no-such'))).status).toBe(404)
			expect((await cargosRoute.POST(jsonReq('/x', 'POST', '{oops'), idParams('no-such'))).status).toBe(400)
			expect((await cargosRoute.POST(jsonReq('/x', 'POST', { numbers: [] }), idParams('no-such'))).status).toBe(400)
			expect((await cargosRoute.POST(jsonReq('/x', 'POST', {}), idParams('no-such'))).status).toBe(400)
		})
	})

	describe('PATCH /api/folders/[id]/cargos: массовое обновление', () => {
		it('статус только из белого списка; произвольная строка → 400 и ничего не меняется', async () => {
			const f = await mkFolder('bulk')
			const c = await mkCargo('BULK', { folderId: f.id })
			for (const status of ['шмель', 'delivered', 7, {}, ['в пути']]) {
				const res = await cargosRoute.PATCH(jsonReq('/x', 'PATCH', { status }), idParams(f.id))
				expect(res.status, JSON.stringify(status)).toBe(400)
			}
			expect((await prisma.cargo.findUnique({ where: { id: c.id } }))?.status).toBe('ожидает отправления')
		})

		it('допустимый статус и город обновляют только активные грузы, прибывшие не трогает', async () => {
			const f = await mkFolder('bulk2')
			const active = await mkCargo('BA', { folderId: f.id })
			const done = await mkCargo('BD', { folderId: f.id, status: 'прибыл', currentCity: 'Москва' })
			const res = await cargosRoute.PATCH(jsonReq('/x', 'PATCH', { status: 'в пути', currentCity: ' Астана ' }), idParams(f.id))
			expect(res.status).toBe(200)
			expect((await res.json()).updated).toBe(1)
			const a = await prisma.cargo.findUnique({ where: { id: active.id } })
			expect([a?.status, a?.currentCity]).toEqual(['в пути', 'Астана'])
			const d = await prisma.cargo.findUnique({ where: { id: done.id } })
			expect([d?.status, d?.currentCity]).toEqual(['прибыл', 'Москва'])
		})

		it('пустое тело → 400; несуществующая папка → 404; битое тело → 400', async () => {
			const f = await mkFolder('bulk3')
			expect((await cargosRoute.PATCH(jsonReq('/x', 'PATCH', {}), idParams(f.id))).status).toBe(400)
			expect((await cargosRoute.PATCH(jsonReq('/x', 'PATCH', { status: 'в пути' }), idParams('no-such'))).status).toBe(404)
			expect((await cargosRoute.PATCH(jsonReq('/x', 'PATCH', 'null'), idParams(f.id))).status).toBe(400)
		})
	})
})
