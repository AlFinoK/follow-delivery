import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { initialWaybill } from '@/lib/waybill/model'
import type { WaybillDTO } from '@/lib/mapWaybill'

// Автоуведомление (T3/T4): когда оно срабатывает, общий дедлайн, таймауты запросов к
// провайдеру. Без БД: notifyClient замокан, провайдер — локальный HTTP-сервер, который
// принимает соединение и никогда не отвечает.

const m = vi.hoisted(() => ({ notify: vi.fn() }))
vi.mock('@/lib/notify/send', () => ({ notifyClient: (...a: unknown[]) => m.notify(...a) }))

import { autoNotify, autoNotifyWithDeadline, isFirstActivation, notifyAfterSave } from '@/lib/notify/auto'
import { fetchText } from '@/lib/notify/http'
import { looksLikePhone } from '@/lib/notify/links'
import { NotifyError } from '@/lib/notify/types'
import * as greenapi from '@/lib/notify/greenapi'

const dto = (status: WaybillDTO['status'], phone = '+79614466655'): WaybillDTO => {
	const w = initialWaybill()
	return {
		...w,
		docId: 'wb1',
		number: 3001,
		status,
		receiver: { ...w.receiver, phone },
		cargoId: 'c1',
		createdAt: '',
		updatedAt: '',
	}
}

const sentOutcome = { status: 'sent', text: '', link: '', whatsappAvailable: true }

beforeEach(() => {
	m.notify.mockReset()
	m.notify.mockResolvedValue(sentOutcome)
})

describe('T4: уведомляем только при первой активации', () => {
	it('новая активная и черновик → активна: отправка', async () => {
		expect(await autoNotify(dto('active'), null)).toEqual({ status: 'sent' })
		expect(await autoNotify(dto('active'), 'draft')).toEqual({ status: 'sent' })
		expect(m.notify).toHaveBeenCalledTimes(2)
	})

	it('возврат в active из delivered/cancelled и active → active: тишина', async () => {
		expect(await autoNotify(dto('active'), 'delivered')).toBeUndefined()
		expect(await autoNotify(dto('active'), 'cancelled')).toBeUndefined()
		expect(await autoNotify(dto('active'), 'active')).toBeUndefined()
		expect(await autoNotify(dto('draft'), null)).toBeUndefined()
		expect(await autoNotify(dto('delivered'), 'draft')).toBeUndefined()
		expect(m.notify).not.toHaveBeenCalled()
	})

	it('isFirstActivation', () => {
		expect(isFirstActivation('active', null)).toBe(true)
		expect(isFirstActivation('active', 'draft')).toBe(true)
		expect(isFirstActivation('active', 'delivered')).toBe(false)
		expect(isFirstActivation('draft', null)).toBe(false)
	})

	it('нет корректного телефона → skipped с кодом BAD_PHONE', async () => {
		expect(await autoNotify(dto('active', '8 961'), null)).toMatchObject({ status: 'skipped', code: 'BAD_PHONE' })
		expect(m.notify).not.toHaveBeenCalled()
	})

	it('код причины пробрасывается из notifyClient', async () => {
		m.notify.mockResolvedValue({ ...sentOutcome, status: 'failed', code: 'RECENTLY_SENT', error: 'уже' })
		expect(await autoNotify(dto('active'), null)).toEqual({ status: 'failed', code: 'RECENTLY_SENT', error: 'уже' })
		m.notify.mockResolvedValue({ ...sentOutcome, status: 'manual', code: 'NOT_CONFIGURED', error: 'нет' })
		expect(await autoNotify(dto('active'), null)).toMatchObject({ status: 'failed', code: 'NOT_CONFIGURED' })
	})

	it('исключение notifyClient не роняет сохранение', async () => {
		m.notify.mockRejectedValue(new Error('db down'))
		expect(await autoNotify(dto('active'), null)).toMatchObject({ status: 'failed', code: 'SEND_ERROR' })
	})
})

describe('T3/T7: дедлайн и отсутствие груза', () => {
	it('зависшая отправка → failed/TIMEOUT за отведённое время', async () => {
		m.notify.mockReturnValue(new Promise(() => {}))
		const started = Date.now()
		const res = await autoNotifyWithDeadline(dto('active'), null, 50)
		expect(res).toMatchObject({ status: 'failed', code: 'TIMEOUT' })
		expect(Date.now() - started).toBeLessThan(2000)
	})

	it('notifyAfterSave тоже ограничен дедлайном', async () => {
		m.notify.mockReturnValue(new Promise(() => {}))
		expect(await notifyAfterSave(dto('active'), 'draft', true, 50)).toMatchObject({ code: 'TIMEOUT' })
	})

	it('быстрая отправка дедлайном не задевается', async () => {
		expect(await autoNotifyWithDeadline(dto('active'), null, 1000)).toEqual({ status: 'sent' })
	})

	it('груз не синхронизирован → skipped/NO_CARGO, клиенту не пишем', async () => {
		expect(await notifyAfterSave(dto('active'), null, false)).toMatchObject({ status: 'skipped', code: 'NO_CARGO' })
		expect(await notifyAfterSave(dto('draft'), null, false)).toBeUndefined()
		expect(m.notify).not.toHaveBeenCalled()
	})
})

describe('T3: таймауты запросов к провайдеру', () => {
	let server: http.Server
	let base = ''

	beforeAll(async () => {
		// Принимает соединение и молчит — ровно тот случай, когда голый fetch висел >15 с.
		server = http.createServer(() => {})
		await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()))
		base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
	})

	afterAll(async () => {
		server.closeAllConnections()
		await new Promise((r) => server.close(r))
	})

	it('fetchText обрывается по таймауту с NotifyError(TIMEOUT)', async () => {
		const started = Date.now()
		const err = await fetchText(`${base}/x`, {}, 300).catch((e) => e)
		expect(err).toBeInstanceOf(NotifyError)
		expect(err.code).toBe('TIMEOUT')
		expect(Date.now() - started).toBeLessThan(3000)
	})

	describe('Green-API: зависший сервис даёт обычный отказ, а не вечное ожидание', () => {
		const realTimeout = AbortSignal.timeout.bind(AbortSignal)
		const env = { ...process.env }

		beforeEach(() => {
			// 8 с в тесте не ждём: сокращаем любой таймаут до 300 мс.
			vi.spyOn(AbortSignal, 'timeout').mockImplementation((ms: number) => realTimeout(Math.min(ms, 300)))
			process.env.GREENAPI_URL = base
			process.env.GREENAPI_ID_INSTANCE = '1100000000'
			process.env.GREENAPI_TOKEN = 'test-token'
		})
		afterEach(() => {
			vi.restoreAllMocks()
			process.env = { ...env }
		})

		it('sendWhatsApp → ok:false, code TIMEOUT', async () => {
			const started = Date.now()
			const res = await greenapi.sendWhatsApp('+79614466655', 'привет')
			expect(res).toMatchObject({ ok: false, code: 'TIMEOUT' })
			expect(Date.now() - started).toBeLessThan(3000)
		})
	})
})

describe('T9: грубая проверка телефона', () => {
	it('E.164', () => {
		expect(looksLikePhone('+79614466655')).toBe(true)
		expect(looksLikePhone(' +77021234567 ')).toBe(true)
		expect(looksLikePhone('89614466655')).toBe(false)
		expect(looksLikePhone('+7961')).toBe(false)
		expect(looksLikePhone('')).toBe(false)
	})
})
