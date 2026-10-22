import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { SESSION, TEST_DB_URL, getReq, idParams, uniquePrefix, useTestDatabase } from './helpers/db'

// Поле lastNotification в GET /api/waybills (список) и GET /api/waybills/[id]: последняя
// строка журнала Notification по накладной (канал не важен), null — уведомлений не было.
// Список собирает его ОДНИМ запросом на страницу (без N+1).

const h = vi.hoisted(() => ({ session: null as unknown }))
vi.mock('next-auth', async (orig) => ({
	...(await orig<typeof import('next-auth')>()),
	getServerSession: vi.fn(async () => h.session),
}))

// Роуты тянут автоуведомление; в сеть тест не ходит.
vi.mock('@/lib/notify/whatsapp', () => ({
	whatsappConfigured: () => true,
	checkNumberExists: vi.fn(),
	sendWhatsApp: vi.fn(),
}))

describe.skipIf(!TEST_DB_URL)('lastNotification в API накладных (БД)', () => {
	type Prisma = typeof import('@/lib/prisma').prisma
	let prisma: Prisma
	let route: typeof import('@/app/api/waybills/route')
	let idRoute: typeof import('@/app/api/waybills/[id]/route')

	const P = uniquePrefix('WLN')
	// Номера выше 1e9 счётчик накладных не учитывает (CARGO_NUMBER_CEIL в number.ts), поэтому
	// они не сдвигают нумерацию параллельных тестов, которые резервируют номера сами.
	let num = 1_500_000_000 + Math.floor(Math.random() * 500_000_000)

	const makeWaybill = (tag: string) =>
		prisma.waybill.create({
			data: {
				number: ++num,
				status: 'active',
				senderFullName: `${P} Отправитель ${tag}`,
				senderAddress: 'ул. Казыбаева 44',
				senderCity: 'Алматы',
				senderCountry: 'Казахстан',
				receiverFullName: `${P} Получатель ${tag}`,
				receiverPhone: '+79990000000',
				receiverAddress: 'ул. Озерная, 15',
				receiverCity: 'Краснодар',
				receiverCountry: 'Россия',
				nature: 'Мототехника',
			},
		})

	const note = (waybillId: string, status: string, minutesAgo: number, extra: { channel?: string; error?: string } = {}) =>
		prisma.notification.create({
			data: {
				waybillId,
				phone: '+79990000000',
				text: 'текст',
				channel: extra.channel ?? 'whatsapp',
				status,
				error: extra.error ?? null,
				createdAt: new Date(Date.now() - minutesAgo * 60_000),
			},
		})

	let ids: { failed: string; none: string; sms: string; read: string }

	beforeAll(async () => {
		useTestDatabase()
		;({ prisma } = await import('@/lib/prisma'))
		route = await import('@/app/api/waybills/route')
		idRoute = await import('@/app/api/waybills/[id]/route')

		const [a, b, c, d] = await Promise.all([makeWaybill('A'), makeWaybill('B'), makeWaybill('C'), makeWaybill('D')])
		ids = { failed: a.id, none: b.id, sms: c.id, read: d.id }
		// A: сначала успешная отправка, потом неудачная → последняя — failed с причиной.
		await note(a.id, 'sent', 30)
		await note(a.id, 'failed', 5, { error: 'BAD_CONTACT: У номера нет WhatsApp' })
		// C: старая строка SMS-канала — канал не важен, берётся всё равно.
		await note(c.id, 'delivered', 60, { channel: 'sms' })
		// D: новее — read; старее — failed (порядок вставки обратный времени).
		await note(d.id, 'read', 1)
		await note(d.id, 'failed', 120, { error: 'TIMEOUT: нет ответа' })
	})

	afterAll(async () => {
		if (!prisma) return
		const rows = await prisma.waybill.findMany({ where: { senderFullName: { startsWith: P } }, select: { id: true } })
		const wid = rows.map((r) => r.id)
		await prisma.notification.deleteMany({ where: { waybillId: { in: wid } } })
		await prisma.waybill.deleteMany({ where: { id: { in: wid } } })
	})

	beforeEach(() => {
		h.session = SESSION
	})

	it('список: последняя строка журнала по каждой накладной, null — если не было', async () => {
		const res = await route.GET(getReq(`/api/waybills?q=${encodeURIComponent(P)}`))
		expect(res.status).toBe(200)
		const json = await res.json()
		const byId = new Map<string, { lastNotification: unknown }>(json.items.map((w: { docId: string }) => [w.docId, w]))
		expect(byId.size).toBe(4)

		const a = byId.get(ids.failed)!.lastNotification as { status: string; error: string; createdAt: string }
		expect(a.status).toBe('failed')
		expect(a.error).toBe('BAD_CONTACT: У номера нет WhatsApp')
		expect(Date.now() - new Date(a.createdAt).getTime()).toBeLessThan(10 * 60_000)

		expect(byId.get(ids.none)!.lastNotification).toBeNull()
		expect(byId.get(ids.sms)!.lastNotification).toMatchObject({ status: 'delivered', error: null })
		expect(byId.get(ids.read)!.lastNotification).toMatchObject({ status: 'read', error: null })
	})

	it('список: журнал читается одним запросом на страницу (без N+1)', async () => {
		const spy = vi.spyOn(prisma.notification, 'findMany')
		try {
			await route.GET(getReq(`/api/waybills?q=${encodeURIComponent(P)}`))
			expect(spy).toHaveBeenCalledTimes(1)
		} finally {
			spy.mockRestore()
		}
	})

	it('карточка: то же поле в GET /api/waybills/[id]', async () => {
		const get = async (id: string) => (await idRoute.GET(getReq(`/api/waybills/${id}`), idParams(id))).json()
		expect((await get(ids.failed)).lastNotification).toMatchObject({ status: 'failed', error: 'BAD_CONTACT: У номера нет WhatsApp' })
		expect((await get(ids.none)).lastNotification).toBeNull()
		expect((await get(ids.read)).lastNotification).toMatchObject({ status: 'read' })
	})

	it('без сессии — 401 (поле не утекает)', async () => {
		h.session = null
		expect((await route.GET(getReq('/api/waybills'))).status).toBe(401)
		expect((await idRoute.GET(getReq(`/api/waybills/${ids.failed}`), idParams(ids.failed))).status).toBe(401)
	})
})
