import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { TEST_DB_URL, uniquePrefix, useTestDatabase } from './helpers/db'
import { initialWaybill, type Waybill } from '@/lib/waybill/model'

// T5: защита от повторной отправки в notifyClient — атомарна (advisory-замок по накладной)
// и видит отправку «в полёте» (строку pending). Провайдер WhatsApp замокан целиком: в
// сеть тесты не ходят.

const wa = vi.hoisted(() => ({
	send: vi.fn(),
	check: vi.fn(),
}))
vi.mock('@/lib/notify/whatsapp', () => ({
	whatsappConfigured: () => true,
	checkNumberExists: (...a: unknown[]) => wa.check(...a),
	sendWhatsApp: (...a: unknown[]) => wa.send(...a),
}))

describe.skipIf(!TEST_DB_URL)('notifyClient: защита от повтора (БД)', () => {
	type Prisma = typeof import('@/lib/prisma').prisma
	let prisma: Prisma
	let notifyClient: typeof import('@/lib/notify/send').notifyClient

	const P = uniquePrefix('NS')
	let seq = 0
	const waybill = (): Waybill => {
		const w = initialWaybill()
		return {
			...w,
			docId: `${P}-${++seq}`,
			number: 900000 + seq,
			status: 'active',
			receiver: { ...w.receiver, fullName: 'Тест', phone: '+79990000001', city: 'Москва' },
		}
	}

	beforeAll(async () => {
		useTestDatabase()
		;({ prisma } = await import('@/lib/prisma'))
		;({ notifyClient } = await import('@/lib/notify/send'))
	})

	afterAll(async () => {
		await prisma.notification.deleteMany({ where: { waybillId: { startsWith: P } } })
	})

	beforeEach(() => {
		wa.check.mockReset().mockResolvedValue({ exists: true })
		// Отправка занимает время — как у настоящего провайдера, чтобы запросы перекрывались.
		wa.send.mockReset().mockImplementation(async () => {
			await new Promise((r) => setTimeout(r, 300))
			return { ok: true, providerId: `msg-${Math.random()}` }
		})
	})

	it('два одновременных запроса по одной накладной → ровно одна отправка', async () => {
		const w = waybill()
		const [a, b] = await Promise.all([notifyClient(w), notifyClient(w)])
		expect(wa.send).toHaveBeenCalledTimes(1)
		const statuses = [a.status, b.status].sort()
		expect(statuses).toEqual(['failed', 'sent'])
		expect([a.code, b.code]).toContain('RECENTLY_SENT')
		expect(await prisma.notification.count({ where: { waybillId: w.docId } })).toBe(1)
	})

	it('пять одновременных запросов → одна отправка', async () => {
		const w = waybill()
		const res = await Promise.all(Array.from({ length: 5 }, () => notifyClient(w)))
		expect(wa.send).toHaveBeenCalledTimes(1)
		expect(res.filter((r) => r.status === 'sent')).toHaveLength(1)
	})

	it('строка pending (отправка в полёте) блокирует повтор', async () => {
		const w = waybill()
		await prisma.notification.create({
			data: { waybillId: w.docId, waybillNumber: w.number, phone: '+79990000001', text: 't', channel: 'whatsapp', status: 'pending' },
		})
		const res = await notifyClient(w)
		expect(res).toMatchObject({ status: 'failed', code: 'RECENTLY_SENT' })
		expect(wa.send).not.toHaveBeenCalled()
	})

	it('зависшая pending старше 2 минут не блокирует и закрывается как failed', async () => {
		const w = waybill()
		const stale = await prisma.notification.create({
			data: {
				waybillId: w.docId,
				waybillNumber: w.number,
				phone: '+79990000001',
				text: 't',
				channel: 'whatsapp',
				status: 'pending',
				createdAt: new Date(Date.now() - 3 * 60 * 1000),
			},
		})
		const res = await notifyClient(w)
		expect(res.status).toBe('sent')
		expect(wa.send).toHaveBeenCalledTimes(1)
		const after = await prisma.notification.findUnique({ where: { id: stale.id } })
		expect(after?.status).toBe('failed')
		expect(after?.error).toMatch(/^TIMEOUT/)
	})

	it('успешная отправка в окне 10 минут блокирует, старше — нет', async () => {
		const w = waybill()
		const row = await prisma.notification.create({
			data: { waybillId: w.docId, waybillNumber: w.number, phone: '+79990000001', text: 't', channel: 'whatsapp', status: 'delivered' },
		})
		expect(await notifyClient(w)).toMatchObject({ code: 'RECENTLY_SENT' })
		await prisma.notification.update({ where: { id: row.id }, data: { createdAt: new Date(Date.now() - 11 * 60 * 1000) } })
		expect((await notifyClient(w)).status).toBe('sent')
		expect(wa.send).toHaveBeenCalledTimes(1)
	})

	it('неудачная попытка повтор не блокирует', async () => {
		const w = waybill()
		wa.send.mockResolvedValueOnce({ ok: false, code: 'TIMEOUT', error: 'не ответил' })
		expect(await notifyClient(w)).toMatchObject({ status: 'failed', code: 'TIMEOUT' })
		expect((await notifyClient(w)).status).toBe('sent')
	})

	it('успешная отправка → sent, доставка ждёт вебхука (pendingDelivery), id сообщения в журнале', async () => {
		const w = waybill()
		wa.send.mockResolvedValueOnce({ ok: true, providerId: 'BAE5TEST' })
		const res = await notifyClient(w)
		expect(res).toMatchObject({ status: 'sent', pendingDelivery: true })
		const row = await prisma.notification.findUnique({ where: { id: res.notificationId! } })
		expect(row).toMatchObject({ status: 'sent', providerId: 'BAE5TEST', error: null })
		expect(wa.send).toHaveBeenCalledWith('+79990000001', expect.any(String))
	})

	it('номер без WhatsApp → failed/BAD_CONTACT, отправки нет', async () => {
		const w = waybill()
		wa.check.mockResolvedValueOnce({ exists: false })
		expect(await notifyClient(w)).toMatchObject({ status: 'failed', code: 'BAD_CONTACT' })
		expect(wa.send).not.toHaveBeenCalled()
	})

	it('разные накладные друг друга не блокируют', async () => {
		const [a, b] = await Promise.all([notifyClient(waybill()), notifyClient(waybill())])
		expect([a.status, b.status]).toEqual(['sent', 'sent'])
		expect(wa.send).toHaveBeenCalledTimes(2)
	})
})
