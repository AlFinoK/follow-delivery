import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { SESSION, TEST_DB_URL, getReq, idParams, jsonReq, uniquePrefix, useTestDatabase } from './helpers/db'

// Мокаем только getServerSession: authOptions и остальной next-auth настоящие.
const h = vi.hoisted(() => ({ session: null as unknown }))
vi.mock('next-auth', async (orig) => ({
	...(await orig<typeof import('next-auth')>()),
	getServerSession: vi.fn(async () => h.session),
}))

// Нужна настоящая БД: без TEST_DATABASE_URL набор пропускается.
describe.skipIf(!TEST_DB_URL)('API /api/cargos (БД)', () => {
	type Prisma = typeof import('@/lib/prisma').prisma
	type Route = typeof import('@/app/api/cargos/route')
	type IdRoute = typeof import('@/app/api/cargos/[id]/route')
	let prisma: Prisma
	let route: Route
	let idRoute: IdRoute
	let resetRateLimits: () => void

	// Файлы тестов делят одну БД и идут параллельно: данные помечены префиксом и чистятся по нему.
	const P = uniquePrefix('CG')
	const track = (s: string) => `CARGO-${P}-${s}`
	// Диапазон cargoNumber этого файла — 500000+, чтобы не пересекаться с api-folders (600000+).
	let nextNum = 500000
	const num = () => ++nextNum

	let ipSeq = 0
	const ip = () => ({ 'x-forwarded-for': `10.1.${Math.floor(ipSeq / 250)}.${ipSeq++ % 250}` })

	const mk = (suffix: string, extra: Record<string, unknown> = {}) =>
		prisma.cargo.create({
			data: { trackingId: track(suffix), fromCity: 'Алматы', currentCity: 'Алматы', toCity: 'Москва', ...extra },
		})

	const validBody = (suffix: string, extra: Record<string, unknown> = {}) => ({
		id: track(suffix),
		fromCity: 'Алматы',
		currentCity: 'Алматы',
		toCity: 'Москва',
		status: 'ожидает отправления',
		...extra,
	})

	beforeAll(async () => {
		useTestDatabase()
		prisma = (await import('@/lib/prisma')).prisma
		route = await import('@/app/api/cargos/route')
		idRoute = await import('@/app/api/cargos/[id]/route')
		resetRateLimits = (await import('@/lib/apiUtil')).resetRateLimits
	})

	beforeEach(() => {
		h.session = SESSION
		resetRateLimits()
	})

	afterAll(async () => {
		await prisma.cargo.deleteMany({ where: { OR: [{ trackingId: { startsWith: `CARGO-${P}` } }, { trackingId: { startsWith: `LEGACY-${P}` } }, { trackingId: `Legacy-${P}` }] } })
		await prisma.folder.deleteMany({ where: { name: { startsWith: P } } })
		await prisma.$disconnect()
	})

	describe('публичный поиск ?trackingId=', () => {
		const lookup = (q: string, headers = ip()) => route.GET(getReq(`/api/cargos?trackingId=${encodeURIComponent(q)}`, headers))

		it('точный номер → 200 и урезанный публичный DTO без внутренних полей', async () => {
			h.session = null // поиск публичный
			const folder = await prisma.folder.create({ data: { name: `${P}-folder` } })
			const c = await mk('PUB', { cargoNumber: num(), folderId: folder.id, name: 'Квадроцикл', deliveryAmount: 12345 })
			const res = await lookup(track('PUB'))
			expect(res.status).toBe(200)
			const body = await res.json()
			expect(Object.keys(body).sort()).toEqual(
				[
					'id', 'name', 'fromCity', 'currentCity', 'toCity', 'status', 'acceptanceDate', 'shipmentDate',
					'deliveryTimeframe', 'deliveryAmount', 'paymentStatus', 'partialPaymentDetail', 'currency', 'createdAt',
				].sort(),
			)
			expect(body.id).toBe(track('PUB'))
			expect(body.deliveryAmount).toBe(12345)
			for (const hidden of ['docId', 'folderId', 'folderName', 'cargoNumber']) expect(body).not.toHaveProperty(hidden)
			expect(JSON.stringify(body)).not.toContain(c.id)
		})

		it('нижний регистр находит тот же груз', async () => {
			await mk('LOW')
			const res = await lookup(track('LOW').toLowerCase())
			expect(res.status).toBe(200)
			expect((await res.json()).id).toBe(track('LOW'))
		})

		it('унаследованный трек-номер в смешанном регистре находится как есть', async () => {
			await prisma.cargo.create({ data: { trackingId: `Legacy-${P}`, fromCity: 'a', currentCity: 'a', toCity: 'b' } })
			const res = await lookup(`Legacy-${P}`)
			expect(res.status).toBe(200)
			expect((await res.json()).id).toBe(`Legacy-${P}`)
		})

		it('подстановочные знаки LIKE не работают: %, CARGO-%, CARGO-…_ → 404', async () => {
			await mk('WILD1')
			await mk('WILD2')
			for (const q of ['%', '%%', 'CARGO-%', `CARGO-${P}-%`, `CARGO-${P}-WILD_`, `CARGO-${P}-WIL_1`, '_', 'CARGO-_']) {
				const res = await lookup(q)
				expect(res.status, q).toBe(404)
			}
		})

		it('поиск по номеру груза цифрами', async () => {
			const n = num()
			await mk('BYNUM', { cargoNumber: n })
			const res = await lookup(String(n))
			expect(res.status).toBe(200)
			expect((await res.json()).id).toBe(track('BYNUM'))
		})

		it('несколько грузов с одним номером → самый свежий не доставленный', async () => {
			const n = num()
			await mk('DUP-OLD-ARR', { cargoNumber: n, status: 'прибыл', createdAt: new Date('2026-03-01') })
			await mk('DUP-ACTIVE', { cargoNumber: n, status: 'в пути', createdAt: new Date('2026-02-01') })
			const res = await lookup(String(n))
			expect((await res.json()).id).toBe(track('DUP-ACTIVE'))
		})

		it('число больше int32 и ноль → 404, а не 500', async () => {
			for (const q of ['99999999999', '2147483648', '0', '00000', '99999999999999999999999']) {
				const res = await lookup(q)
				expect(res.status, q).toBe(404)
			}
		})

		it('NUL-символ и слишком длинная строка → 404, а не 500', async () => {
			expect((await lookup('abc\u0000def')).status).toBe(404)
			expect((await lookup('X'.repeat(5000))).status).toBe(404)
		})

		it('несуществующий номер → 404', async () => {
			expect((await lookup('NO-SUCH-CARGO')).status).toBe(404)
		})

		it('лимит: 31-й запрос с одного IP → 429 с Retry-After, другой IP не затронут', async () => {
			const headers = ip()
			for (let i = 0; i < 30; i++) expect((await lookup('NO-SUCH-CARGO', headers)).status).toBe(404)
			const limited = await lookup('NO-SUCH-CARGO', headers)
			expect(limited.status).toBe(429)
			expect(Number(limited.headers.get('Retry-After'))).toBeGreaterThanOrEqual(1)
			expect((await lookup('NO-SUCH-CARGO', ip())).status).toBe(404)
		})
	})

	describe('админский список', () => {
		it('без сессии → 401', async () => {
			h.session = null
			expect((await route.GET(getReq('/api/cargos'))).status).toBe(401)
		})

		it('пагинация, полный mapCargo (docId/folderName) и зажим страницы к последней', async () => {
			const tag = `${P}LST`
			// Размер страницы — 20 (PAGE_SIZE в route.ts): 21 груз = две страницы.
			for (let i = 0; i < 21; i++) await mk(`LST${i}`, { name: tag })
			const q = encodeURIComponent(tag)

			const p1 = await (await route.GET(getReq(`/api/cargos?q=${q}&page=1`))).json()
			expect(p1.total).toBe(21)
			expect(p1.page).toBe(1)
			expect(p1.pageSize).toBe(20)
			expect(p1.items).toHaveLength(20)
			expect(p1.items[0]).toHaveProperty('docId')
			expect(p1.items[0]).toHaveProperty('folderName')

			const far = await (await route.GET(getReq(`/api/cargos?q=${q}&page=99`))).json()
			expect(far.page).toBe(2)
			expect(far.items).toHaveLength(1)
		})

		it('мусорный page: дробный, отрицательный, нечисловой, огромный → 200 и корректная страница', async () => {
			const q = encodeURIComponent(`${P}LST`)
			for (const bad of ['1.5', '-3', '0', 'abc', '99999999999999999999']) {
				const res = await route.GET(getReq(`/api/cargos?q=${q}&page=${bad}`))
				expect(res.status, bad).toBe(200)
				const body = await res.json()
				expect(body.page, bad).toBeGreaterThanOrEqual(1)
				expect(body.page, bad).toBeLessThanOrEqual(2)
			}
		})

		it('пустая выборка: page = 1', async () => {
			const body = await (await route.GET(getReq(`/api/cargos?q=${P}NOTHING-LIKE-THIS&page=7`))).json()
			expect(body.total).toBe(0)
			expect(body.page).toBe(1)
		})

		it('числовой q за пределами int32 → 200, а не 500', async () => {
			const res = await route.GET(getReq('/api/cargos?q=99999999999'))
			expect(res.status).toBe(200)
		})

		it('q ищет по номеру груза', async () => {
			const n = num()
			await mk('QNUM', { cargoNumber: n })
			const body = await (await route.GET(getReq(`/api/cargos?q=${n}`))).json()
			expect(body.items.some((i: { id: string }) => i.id === track('QNUM'))).toBe(true)
		})
	})

	describe('POST /api/cargos', () => {
		it('без сессии → 401', async () => {
			h.session = null
			expect((await route.POST(jsonReq('/api/cargos', 'POST', validBody('P401')))).status).toBe(401)
		})

		it('битое тело и не-объект → 400 «Некорректное тело запроса»', async () => {
			for (const raw of ['{oops', 'null', '[]', '42']) {
				const res = await route.POST(jsonReq('/api/cargos', 'POST', raw))
				expect(res.status, raw).toBe(400)
				expect((await res.json()).error).toBe('Некорректное тело запроса')
			}
		})

		it('не хватает обязательных полей → 400', async () => {
			expect((await route.POST(jsonReq('/api/cargos', 'POST', { id: track('X') }))).status).toBe(400)
		})

		it('допустимый груз → 201, id = трек-номер в верхнем регистре, значения по умолчанию', async () => {
			const n = num()
			const res = await route.POST(jsonReq('/api/cargos', 'POST', validBody('ok-1', { cargoNumber: String(n), deliveryAmount: '1500.5' })))
			expect(res.status).toBe(201)
			const body = await res.json()
			expect(body.id).toBe(track('OK-1'))
			expect(body.docId).toBeTruthy()
			expect(body.cargoNumber).toBe(n)
			expect(body.deliveryAmount).toBe(1500.5)
			expect(body.paymentStatus).toBe('none')
			expect(body.currency).toBe('KZT')
		})

		it('недопустимые status / paymentStatus / currency → 400 с русским сообщением', async () => {
			const cases: Record<string, unknown>[] = [
				{ status: 'шмель' },
				{ status: 5 },
				{ paymentStatus: 'half' },
				{ currency: 'USD' },
				{ currency: 7 },
			]
			for (const c of cases) {
				const res = await route.POST(jsonReq('/api/cargos', 'POST', validBody('BADENUM', c)))
				expect(res.status, JSON.stringify(c)).toBe(400)
				expect((await res.json()).error).toMatch(/[А-Яа-я]/)
			}
			expect(await prisma.cargo.count({ where: { trackingId: track('BADENUM') } })).toBe(0)
		})

		it('некорректный cargoNumber (NaN, дробь, переполнение, ноль) → 400', async () => {
			for (const cargoNumber of ['abc', 1.5, '1.5', 99999999999, '99999999999', 0, -4, {}]) {
				const res = await route.POST(jsonReq('/api/cargos', 'POST', validBody('BADNUM', { cargoNumber })))
				expect(res.status, JSON.stringify(cargoNumber)).toBe(400)
			}
		})

		it('Invalid Date и нестроковые даты → 400', async () => {
			for (const d of ['not-a-date', '2026-13-45', {}, true]) {
				const a = await route.POST(jsonReq('/api/cargos', 'POST', validBody('BADDATE', { acceptanceDate: d })))
				expect(a.status, JSON.stringify(d)).toBe(400)
				const s = await route.POST(jsonReq('/api/cargos', 'POST', validBody('BADDATE', { shipmentDate: d })))
				expect(s.status, JSON.stringify(d)).toBe(400)
			}
		})

		it('нестроковый id → 400', async () => {
			for (const id of [123, {}, ['A'], true]) {
				const res = await route.POST(jsonReq('/api/cargos', 'POST', validBody('X', { id })))
				expect(res.status, JSON.stringify(id)).toBe(400)
			}
		})

		it('дубль трек-номера → 409', async () => {
			expect((await route.POST(jsonReq('/api/cargos', 'POST', validBody('DUPT')))).status).toBe(201)
			const res = await route.POST(jsonReq('/api/cargos', 'POST', validBody('dupt')))
			expect(res.status).toBe(409)
		})

		it('номер, занятый другим грузом → 409 «Номер уже занят»', async () => {
			const n = num()
			await mk('NUMTAKEN', { cargoNumber: n })
			const res = await route.POST(jsonReq('/api/cargos', 'POST', validBody('NUMTAKEN2', { cargoNumber: n })))
			expect(res.status).toBe(409)
			expect((await res.json()).error).toBe('Номер уже занят')
			expect(await prisma.cargo.count({ where: { trackingId: track('NUMTAKEN2') } })).toBe(0)
		})
	})

	describe('PATCH/DELETE /api/cargos/[id]', () => {
		it('без сессии → 401', async () => {
			const c = await mk('AUTH')
			h.session = null
			expect((await idRoute.GET(getReq('/x'), idParams(c.id))).status).toBe(401)
			expect((await idRoute.PATCH(jsonReq('/x', 'PATCH', { name: 'x' }), idParams(c.id))).status).toBe(401)
			expect((await idRoute.DELETE(getReq('/x'), idParams(c.id))).status).toBe(401)
		})

		it('успешное обновление; пустое тело → 400; битое тело → 400', async () => {
			const c = await mk('UPD')
			const ok = await idRoute.PATCH(jsonReq('/x', 'PATCH', { status: 'в пути', currentCity: 'Астана', deliveryAmount: '' }), idParams(c.id))
			expect(ok.status).toBe(200)
			const body = await ok.json()
			expect(body.status).toBe('в пути')
			expect(body.currentCity).toBe('Астана')
			expect(body.deliveryAmount).toBeNull()
			expect((await idRoute.PATCH(jsonReq('/x', 'PATCH', {}), idParams(c.id))).status).toBe(400)
			expect((await idRoute.PATCH(jsonReq('/x', 'PATCH', '{oops'), idParams(c.id))).status).toBe(400)
		})

		it('недопустимые значения → 400 и ничего не записывается', async () => {
			const c = await mk('UPDBAD')
			for (const patch of [
				{ status: 'шмель' },
				{ paymentStatus: 'x' },
				{ currency: 'EUR' },
				{ cargoNumber: 'abc' },
				{ cargoNumber: 99999999999 },
				{ acceptanceDate: 'garbage' },
				{ fromCity: '' },
				{ toCity: 5 },
			]) {
				const res = await idRoute.PATCH(jsonReq('/x', 'PATCH', patch), idParams(c.id))
				expect(res.status, JSON.stringify(patch)).toBe(400)
			}
			const fresh = await prisma.cargo.findUnique({ where: { id: c.id } })
			expect(fresh?.status).toBe('ожидает отправления')
		})

		it('номер другого груза → 409, свой собственный номер → 200', async () => {
			const n1 = num()
			const n2 = num()
			const a = await mk('NA', { cargoNumber: n1 })
			const b = await mk('NB', { cargoNumber: n2 })
			const clash = await idRoute.PATCH(jsonReq('/x', 'PATCH', { cargoNumber: n1 }), idParams(b.id))
			expect(clash.status).toBe(409)
			expect((await clash.json()).error).toBe('Номер уже занят')
			const same = await idRoute.PATCH(jsonReq('/x', 'PATCH', { cargoNumber: n1, name: 'тот же' }), idParams(a.id))
			expect(same.status).toBe(200)
			const cleared = await idRoute.PATCH(jsonReq('/x', 'PATCH', { cargoNumber: null }), idParams(a.id))
			expect((await cleared.json()).cargoNumber).toBeNull()
		})

		it('несуществующая папка → 400, существующая → ок, null открепляет', async () => {
			const c = await mk('FOLD')
			const bad = await idRoute.PATCH(jsonReq('/x', 'PATCH', { folderId: 'no-such-folder' }), idParams(c.id))
			expect(bad.status).toBe(400)
			expect((await idRoute.PATCH(jsonReq('/x', 'PATCH', { folderId: 123 }), idParams(c.id))).status).toBe(400)
			const f = await prisma.folder.create({ data: { name: `${P}-pf` } })
			const ok = await idRoute.PATCH(jsonReq('/x', 'PATCH', { folderId: f.id }), idParams(c.id))
			expect((await ok.json()).folderId).toBe(f.id)
			const un = await idRoute.PATCH(jsonReq('/x', 'PATCH', { folderId: null }), idParams(c.id))
			expect((await un.json()).folderId).toBeNull()
		})

		it('PATCH и DELETE несуществующего id → 404 (P2025), а не 500', async () => {
			const p = await idRoute.PATCH(jsonReq('/x', 'PATCH', { name: 'x' }), idParams('no-such-id'))
			expect(p.status).toBe(404)
			const d = await idRoute.DELETE(getReq('/x'), idParams('no-such-id'))
			expect(d.status).toBe(404)
			expect((await idRoute.GET(getReq('/x'), idParams('no-such-id'))).status).toBe(404)
		})

		it('DELETE существующего → 200 и груз исчезает', async () => {
			const c = await mk('DEL')
			expect((await idRoute.DELETE(getReq('/x'), idParams(c.id))).status).toBe(200)
			expect(await prisma.cargo.findUnique({ where: { id: c.id } })).toBeNull()
		})
	})
})
