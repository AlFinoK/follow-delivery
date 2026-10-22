import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { SESSION, TEST_DB_URL, getReq, idParams, jsonReq, uniquePrefix, useTestDatabase } from './helpers/db'

// API накладных на настоящей БД: повтор сохранения (T1), привязка к грузу и груз
// «Доставлена» (T7), PATCH/DELETE (T6), список (T6), когда уведомляем клиента (T4).
// Провайдер WhatsApp замокан: в сеть тесты не ходят, считаем вызовы отправки.

const h = vi.hoisted(() => ({ session: null as unknown }))
vi.mock('next-auth', async (orig) => ({
	...(await orig<typeof import('next-auth')>()),
	getServerSession: vi.fn(async () => h.session),
}))

const wa = vi.hoisted(() => ({ send: vi.fn(), check: vi.fn(), confirm: vi.fn() }))
vi.mock('@/lib/notify/whatsapp', () => ({
	whatsappProvider: () => 'waha',
	whatsappConfigured: () => true,
	checkNumberExists: (...a: unknown[]) => wa.check(...a),
	sendWhatsApp: (...a: unknown[]) => wa.send(...a),
	confirmDelivery: (...a: unknown[]) => wa.confirm(...a),
}))

describe.skipIf(!TEST_DB_URL)('API /api/waybills (БД)', () => {
	type Prisma = typeof import('@/lib/prisma').prisma
	let prisma: Prisma
	let route: typeof import('@/app/api/waybills/route')
	let idRoute: typeof import('@/app/api/waybills/[id]/route')
	let numberRoute: typeof import('@/app/api/waybills/number/route')

	const P = uniquePrefix('WB')
	let seq = 0
	const phone = () => '+7999' + String(Math.floor(Math.random() * 1e7)).padStart(7, '0')

	const body = (over: Record<string, unknown> = {}, who = `${++seq}`) => ({
		status: 'active',
		sender: { fullName: `${P} Отправитель ${who}`, type: 'individual', address: 'ул. Казыбаева 44', city: 'Алматы', country: 'Казахстан' },
		receiver: { fullName: `${P} Получатель ${who}`, phone: phone(), address: 'ул. Озерная, 15', city: 'Краснодар', country: 'Россия' },
		nature: 'Мототехника',
		positions: [{ name: 'Квадроцикл', quantity: 1, length: 200, width: 100, height: 100, weight: 300, price: 0 }],
		amount: 100000,
		acceptanceDate: '2026-10-01',
		...over,
	})

	const post = async (b: unknown) => {
		const res = await route.POST(jsonReq('/api/waybills', 'POST', b))
		return { status: res.status, json: await res.json() }
	}
	const patch = async (id: string, b: unknown) => {
		const res = await idRoute.PATCH(jsonReq(`/api/waybills/${id}`, 'PATCH', b), idParams(id))
		return { status: res.status, json: await res.json() }
	}
	const reserve = async () => (await (await numberRoute.POST()).json()).number as number

	beforeAll(async () => {
		useTestDatabase()
		;({ prisma } = await import('@/lib/prisma'))
		route = await import('@/app/api/waybills/route')
		idRoute = await import('@/app/api/waybills/[id]/route')
		numberRoute = await import('@/app/api/waybills/number/route')
	})

	afterAll(async () => {
		const rows = await prisma.waybill.findMany({ where: { senderFullName: { startsWith: P } }, select: { id: true, cargoId: true, number: true } })
		const cargoIds = rows.map((r) => r.cargoId).filter((x): x is string => !!x)
		await prisma.notification.deleteMany({ where: { waybillId: { in: rows.map((r) => r.id) } } })
		await prisma.waybill.deleteMany({ where: { id: { in: rows.map((r) => r.id) } } })
		await prisma.cargo.deleteMany({
			where: {
				OR: [
					{ id: { in: cargoIds } },
					{ trackingId: { startsWith: `CARGO-${P}` } },
					{ trackingId: { in: rows.map((r) => `CARGO-${r.number}`) } },
				],
			},
		})
	})

	beforeEach(() => {
		h.session = SESSION
		wa.check.mockReset().mockResolvedValue({ exists: true })
		wa.send.mockReset().mockResolvedValue({ ok: true, providerId: 'm1' })
		wa.confirm.mockReset().mockResolvedValue(undefined)
	})

	it('без сессии — 401', async () => {
		h.session = null
		expect((await route.POST(jsonReq('/api/waybills', 'POST', body()))).status).toBe(401)
	})

	it('создание активной: 201, груз CARGO-<номер>, одно уведомление', async () => {
		const { status, json } = await post(body())
		expect(status).toBe(201)
		expect(json.notified).toEqual({ status: 'sent' })
		const cargo = await prisma.cargo.findUnique({ where: { id: json.cargoId } })
		expect(cargo?.trackingId).toBe(`CARGO-${json.number}`)
		expect(cargo?.currentCity).toBe('Алматы')
		expect(wa.send).toHaveBeenCalledTimes(1)
	})

	describe('T1: повтор сохранения', () => {
		it('тот же номер и те же люди → та же накладная (200), без второго груза и сообщения', async () => {
			const number = await reserve()
			const b = body({ number })
			const first = await post(b)
			expect(first.status).toBe(201)
			const again = await post(b)
			expect(again.status).toBe(200)
			expect(again.json.docId).toBe(first.json.docId)
			expect(again.json.notified).toBeUndefined()
			expect(await prisma.waybill.count({ where: { receiverPhone: b.receiver.phone } })).toBe(1)
			expect(await prisma.cargo.count({ where: { trackingId: `CARGO-${number}` } })).toBe(1)
			expect(wa.send).toHaveBeenCalledTimes(1)
		})

		it('одновременные повторы тоже дают одну накладную', async () => {
			const number = await reserve()
			const b = body({ number })
			const res = await Promise.all([post(b), post(b), post(b)])
			expect(new Set(res.map((r) => r.json.docId)).size).toBe(1)
			expect(res.map((r) => r.status).sort()).toEqual([200, 200, 201])
			expect(await prisma.waybill.count({ where: { receiverPhone: b.receiver.phone } })).toBe(1)
			expect(wa.send).toHaveBeenCalledTimes(1)
		})

		it('повтор «долечивает» груз, если в первый раз он не создался', async () => {
			const number = await reserve()
			const b = body({ number })
			// Первая попытка записала накладную, но не дошла до груза.
			const { waybillData, waybillItems } = await import('@/lib/mapWaybill')
			await prisma.waybill.create({ data: { ...waybillData(b), number, items: { create: waybillItems(b) } } })
			const again = await post(b)
			expect(again.status).toBe(200)
			expect(again.json.cargoId).toBeTruthy()
			expect(wa.send).not.toHaveBeenCalled()
		})

		it('номер занят ДРУГОЙ накладной → новый номер (201)', async () => {
			const number = await reserve()
			expect((await post(body({ number }))).status).toBe(201)
			const other = await post(body({ number }))
			expect(other.status).toBe(201)
			expect(other.json.number).not.toBe(number)
			expect(wa.send).toHaveBeenCalledTimes(2)
		})

		it('те же люди, но накладная старше 30 минут → это не повтор', async () => {
			const number = await reserve()
			const b = body({ number })
			const first = await post(b)
			await prisma.waybill.update({ where: { id: first.json.docId }, data: { createdAt: new Date(Date.now() - 31 * 60 * 1000) } })
			const second = await post(b)
			expect(second.status).toBe(201)
			expect(second.json.docId).not.toBe(first.json.docId)
		})

		it('номер-мусор игнорируется, выдаётся свой', async () => {
			const { status, json } = await post(body({ number: 99999999999 }))
			expect(status).toBe(201)
			expect(json.number).toBeLessThan(1_000_000_000)
		})
	})

	describe('T7: груз', () => {
		it('cargoId существующего груза: накладная привязывается к нему, CARGO-<номер> не создаётся', async () => {
			const cargo = await prisma.cargo.create({
				data: { trackingId: `CARGO-${P}-LINK`, fromCity: 'Алматы', currentCity: 'Алматы', toCity: 'Москва' },
			})
			const { status, json } = await post(body({ cargoId: cargo.id }))
			expect(status).toBe(201)
			expect(json.cargoId).toBe(cargo.id)
			expect(await prisma.cargo.count({ where: { trackingId: `CARGO-${json.number}` } })).toBe(0)
			const after = await prisma.cargo.findUnique({ where: { id: cargo.id } })
			expect(after?.cargoNumber).toBe(json.number)

			// Второй раз тот же груз — уже занят.
			const taken = await post(body({ cargoId: cargo.id }))
			expect(taken.status).toBe(400)
			expect(taken.json.error).toMatch(/уже привязана/)
		})

		it('несуществующий cargoId → 400', async () => {
			const { status, json } = await post(body({ cargoId: 'nope' }))
			expect(status).toBe(400)
			expect(json.error).toMatch(/не найден/)
		})

		it('накладная сразу «Доставлена»: груз прибыл, текущий город — город получателя', async () => {
			const { json } = await post(body({ status: 'delivered' }))
			const cargo = await prisma.cargo.findUnique({ where: { id: json.cargoId } })
			expect(cargo?.status).toBe('прибыл')
			expect(cargo?.currentCity).toBe('Краснодар')
			expect(json.notified).toBeUndefined()
		})

		it('груз не синхронизировался → клиенту не пишем, notified = skipped/NO_CARGO', async () => {
			// CARGO-<N> уже существует и привязан к другой накладной: связать не получится.
			const number = await reserve()
			const blocker = await prisma.cargo.create({
				data: { trackingId: `CARGO-${number}`, fromCity: 'Алматы', currentCity: 'Алматы', toCity: 'Москва' },
			})
			const owner = await post(body({ cargoId: blocker.id }))
			expect(owner.json.cargoId).toBe(blocker.id)
			wa.send.mockClear()

			const { status, json } = await post(body({ number }))
			expect(status).toBe(201)
			expect(json.number).toBe(number)
			expect(json.cargoId).toBeNull()
			expect(json.notified).toMatchObject({ status: 'skipped', code: 'NO_CARGO' })
			expect(wa.send).not.toHaveBeenCalled()
		})
	})

	describe('T6: PATCH / DELETE', () => {
		it('без status или без массива positions → 400; битый JSON → 400', async () => {
			const { json } = await post(body({ status: 'draft' }))
			const b = body({ status: 'draft' })
			const { status: _s, ...noStatus } = b
			void _s
			expect((await patch(json.docId, noStatus)).status).toBe(400)
			expect((await patch(json.docId, { ...b, status: 'weird' })).status).toBe(400)
			expect((await patch(json.docId, { ...b, positions: undefined })).status).toBe(400)
			expect((await patch(json.docId, { ...b, positions: 'x' })).status).toBe(400)
			expect((await patch(json.docId, '{oops')).status).toBe(400)
			// накладная не тронута
			const row = await prisma.waybill.findUnique({ where: { id: json.docId }, include: { items: true } })
			expect(row?.items).toHaveLength(1)
		})

		it('несуществующий id: PATCH и DELETE → 404', async () => {
			expect((await patch('missing-id', body())).status).toBe(404)
			const res = await idRoute.DELETE(getReq('/api/waybills/missing-id'), idParams('missing-id'))
			expect(res.status).toBe(404)
		})

		it('два одновременных «черновик → активна» уведомляют один раз', async () => {
			const b = body({ status: 'draft' })
			const { json } = await post(b)
			const active = { ...b, status: 'active' }
			const res = await Promise.all([patch(json.docId, active), patch(json.docId, active)])
			expect(res.map((r) => r.status)).toEqual([200, 200])
			// Второй запрос видит уже active и уведомление не запускает вовсе (а не упирается в защиту от повтора).
			const notified = res.map((r) => r.json.notified)
			expect(notified.filter((n) => n?.status === 'sent')).toHaveLength(1)
			expect(notified.filter((n) => n === undefined)).toHaveLength(1)
			expect(wa.send).toHaveBeenCalledTimes(1)
		})

		it('T4: delivered → active клиенту не пишет', async () => {
			const b = body({ status: 'draft' })
			const { json } = await post(b)
			await patch(json.docId, { ...b, status: 'active' })
			await patch(json.docId, { ...b, status: 'delivered' })
			const back = await patch(json.docId, { ...b, status: 'active' })
			expect(back.json.notified).toBeUndefined()
			expect(wa.send).toHaveBeenCalledTimes(1)
		})

		it('DELETE существующей → 200', async () => {
			const { json } = await post(body({ status: 'draft' }))
			const res = await idRoute.DELETE(getReq(`/api/waybills/${json.docId}`), idParams(json.docId))
			expect(res.status).toBe(200)
			expect(await prisma.waybill.findUnique({ where: { id: json.docId } })).toBeNull()
		})
	})

	describe('T6: список', () => {
		const list = async (qs: string) => {
			const res = await route.GET(getReq(`/api/waybills?${qs}`))
			return { status: res.status, json: await res.json() }
		}

		it('страница за пределами прижимается к последней', async () => {
			const b = body({ status: 'draft' })
			await post(b)
			const { json } = await list(`q=${encodeURIComponent(b.sender.fullName)}&page=99`)
			expect(json.page).toBe(1)
			expect(json.items).toHaveLength(1)
			expect((await list(`q=${encodeURIComponent(b.sender.fullName)}&page=abc`)).json.page).toBe(1)
		})

		it('«№номер», номер больше int32 и телефон в любом формате', async () => {
			const b = body({ status: 'draft' })
			const { json: created } = await post(b)
			expect((await list(`q=${encodeURIComponent('№' + created.number)}`)).json.items.map((i: { docId: string }) => i.docId)).toContain(created.docId)
			expect((await list('q=99999999999')).status).toBe(200)
			const p = b.receiver.phone as string // +7999XXXXXXX
			const pretty = `+7 (${p.slice(2, 5)}) ${p.slice(5, 8)}-${p.slice(8, 10)}-${p.slice(10)}`
			const found = await list(`q=${encodeURIComponent(pretty)}`)
			expect(found.json.items.map((i: { docId: string }) => i.docId)).toContain(created.docId)
		})
	})
})
