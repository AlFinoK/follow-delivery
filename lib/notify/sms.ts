// SMS-фолбэк: отправка, когда уведомление не ушло в WhatsApp.
//
//   SMS_PROVIDER=smsc        → SMS-Центр (smsc.ru / smsc.kz), ключ в apikey
//   SMS_PROVIDER=smsgate     → SMS Gateway for Android (sms-gate.app), Basic-авторизация
//   SMS_PROVIDER=httpsms     → httpSMS (httpsms.com), ключ в заголовке x-api-key
//   SMS_PROVIDER=infinireach → InfiniReach (infinireach.io), ключ в X-API-Key
//   SMS_PROVIDER не задан    → отправки нет, оператор получает ссылку sms: и жмёт сам
//
// ⚠️ Почему сначала были только шлюзы на телефоне. Получатели — физлица в РФ, а туда
// агрегаторы шлют от ЗАРЕГИСТРИРОВАННОГО имени отправителя, и операторы РФ берут за имя
// абонентскую плату: по тарифам smsc.kz это 11–16 тыс. ₸ в месяц за оператора, то есть
// ~56 тыс. ₸ за все четыре. При наших объёмах (пара десятков SMS в месяц, основной
// поток идёт в WhatsApp) это ~2 000 ₸ за сообщение — абсурд.
//
// Поэтому с SMSC работаем БЕЗ имени отправителя: `sender` не передаётся, сообщение
// уходит с цифрового номера, абонентской платы нет, платим только за отправленные.
// Цена: доставка не гарантирована, сообщения идут каналами региональных операторов.
// Ровно из-за этого ниже есть smsDeliveryStatus — журнал должен показывать правду,
// а не «отправлено» на недоставленном сообщении. Если по какому-то оператору доставка
// окажется плохой, имя можно зарегистрировать потом и только у него (SMSC_SENDER).

import { NOT_CONFIGURED, type SendResult } from './types'

type Provider = 'smsc' | 'smsgate' | 'httpsms' | 'infinireach' | 'none'

const SMSC_SEND_URL = 'https://smsc.kz/sys/send.php'
const SMSC_STATUS_URL = 'https://smsc.kz/sys/status.php'
const SMSGATE_DEFAULT_URL = 'https://api.sms-gate.app/3rdparty/v1'
const HTTPSMS_URL = 'https://api.httpsms.com/v1/messages/send'
const INFINIREACH_URL = 'https://api.infinireach.io/api/v1/messages'

export function smsProvider(): Provider {
	const raw = process.env.SMS_PROVIDER?.trim().toLowerCase()
	// Имя отправителя (SMSC_SENDER) намеренно НЕ входит в условие: без него отправка
	// тоже работает, просто с цифрового номера (см. шапку файла).
	if (raw === 'smsc' && process.env.SMSC_API_KEY) return 'smsc'
	if (raw === 'smsgate' && process.env.SMS_GATEWAY_LOGIN && process.env.SMS_GATEWAY_PASSWORD) return 'smsgate'
	if (raw === 'httpsms' && process.env.HTTPSMS_API_KEY && process.env.SMS_FROM) return 'httpsms'
	if (raw === 'infinireach' && process.env.INFINIREACH_API_KEY && process.env.SMS_FROM) return 'infinireach'
	return 'none'
}

export function smsConfigured(): boolean {
	return smsProvider() !== 'none'
}

/**
 * `externalId` — ключ идемпотентности (у нас это id строки журнала). Поддерживает
 * его пока только InfiniReach; остальные провайдеры аргумент игнорируют.
 */
export async function sendSms(phone: string, text: string, externalId?: string): Promise<SendResult> {
	switch (smsProvider()) {
		case 'smsc':
			return sendViaSmsc(phone, text)
		case 'smsgate':
			return sendViaSmsGate(phone, text)
		case 'httpsms':
			return sendViaHttpSms(phone, text)
		case 'infinireach':
			return sendViaInfiniReach(phone, text, externalId)
		default:
			return { ok: false, code: NOT_CONFIGURED, error: 'SMS-шлюз не настроен' }
	}
}

/**
 * SMS-Центр: POST /sys/send.php, авторизация через `apikey`.
 *
 * `charset=utf-8` обязателен — по умолчанию сервис ждёт windows-1251 и кириллица
 * приедет кракозябрами. `fmt=3` — ответ в JSON.
 *
 * Свой `id` НЕ передаём, хотя параметр есть: SMSC принимает только числовой
 * идентификатор, а у нас id строки журнала — cuid. Поэтому идентификатором служит `id`
 * из ответа сервиса, он же нужен для запроса статуса. Защита от дублей у нас своя
 * (окно повторной отправки в send.ts и связь `fallbackOf`).
 */
async function sendViaSmsc(phone: string, text: string): Promise<SendResult> {
	const params = new URLSearchParams({
		apikey: process.env.SMSC_API_KEY as string,
		phones: phone,
		mes: text,
		charset: 'utf-8',
		fmt: '3',
	})
	// Без имени отправителя сообщение уходит с цифрового номера — это рабочий режим,
	// а не ошибка конфигурации (см. шапку файла).
	const sender = process.env.SMSC_SENDER?.trim()
	if (sender) params.set('sender', sender)

	try {
		const res = await fetch(SMSC_SEND_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8' },
			body: params,
			cache: 'no-store',
		})
		const body = (await safeJson(res)) as { id?: number | string; cnt?: number; error?: string; error_code?: number } | null
		if (!res.ok) return { ok: false, code: `HTTP_${res.status}`, error: describe(body, res.status) }
		// SMSC отвечает 200 и на отказ: ошибка приходит телом, а не кодом ответа.
		if (body?.error || body?.error_code) {
			return { ok: false, code: `SMSC_${body.error_code ?? 'ERR'}`, error: body.error || 'SMSC отклонил отправку' }
		}
		return { ok: true, providerId: body?.id !== undefined ? String(body.id) : undefined }
	} catch (e) {
		return { ok: false, code: 'NETWORK', error: e instanceof Error ? e.message : 'Ошибка сети' }
	}
}

/** SMS Gateway for Android: POST /messages, Basic-авторизация, номер в E.164. */
async function sendViaSmsGate(phone: string, text: string): Promise<SendResult> {
	const base = (process.env.SMS_GATEWAY_URL?.trim() || SMSGATE_DEFAULT_URL).replace(/\/+$/, '')
	const auth = Buffer.from(`${process.env.SMS_GATEWAY_LOGIN}:${process.env.SMS_GATEWAY_PASSWORD}`).toString('base64')
	try {
		const res = await fetch(`${base}/messages`, {
			method: 'POST',
			headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
			body: JSON.stringify({ textMessage: { text }, phoneNumbers: [phone] }),
			cache: 'no-store',
		})
		const body = (await safeJson(res)) as { id?: string; state?: string } | null
		if (!res.ok) return { ok: false, code: `HTTP_${res.status}`, error: describe(body, res.status) }
		return { ok: true, providerId: body?.id }
	} catch (e) {
		return { ok: false, code: 'NETWORK', error: e instanceof Error ? e.message : 'Ошибка сети' }
	}
}

/** httpSMS: POST /v1/messages/send, ключ в x-api-key, номер отправителя обязателен. */
async function sendViaHttpSms(phone: string, text: string): Promise<SendResult> {
	try {
		const res = await fetch(HTTPSMS_URL, {
			method: 'POST',
			headers: { 'x-api-key': process.env.HTTPSMS_API_KEY as string, 'Content-Type': 'application/json' },
			body: JSON.stringify({ from: process.env.SMS_FROM, to: phone, content: text }),
			cache: 'no-store',
		})
		const body = (await safeJson(res)) as { data?: { id?: string }; message?: string } | null
		if (!res.ok) return { ok: false, code: `HTTP_${res.status}`, error: describe(body, res.status) }
		return { ok: true, providerId: body?.data?.id }
	} catch (e) {
		return { ok: false, code: 'NETWORK', error: e instanceof Error ? e.message : 'Ошибка сети' }
	}
}

/**
 * InfiniReach: POST /api/v1/messages, ключ в X-API-Key.
 *
 * `from` — номер зарегистрированного устройства и должен совпадать с ним ТОЧНО
 * (берём из SMS_FROM). `channel: 'sms'` обязателен: тот же эндпоинт умеет и WhatsApp,
 * а нам сюда попадают только те, у кого WhatsApp нет.
 */
async function sendViaInfiniReach(phone: string, text: string, externalId?: string): Promise<SendResult> {
	try {
		const res = await fetch(INFINIREACH_URL, {
			method: 'POST',
			headers: { 'X-API-Key': process.env.INFINIREACH_API_KEY as string, 'Content-Type': 'application/json' },
			body: JSON.stringify({
				to: phone,
				message: text,
				from: process.env.SMS_FROM,
				channel: 'sms',
				// Защита от дублей: повторный вебхук не отправит клиенту второе SMS.
				...(externalId ? { externalId } : {}),
			}),
			cache: 'no-store',
		})
		const body = (await safeJson(res)) as
			| { messageId?: string; id?: string; data?: { messageId?: string; id?: string }; message?: string; error?: string }
			| null
		if (!res.ok) return { ok: false, code: `HTTP_${res.status}`, error: describe(body, res.status) }
		// Документация называет поле `messageId`; `id` оставлен на случай, если ответ
		// придёт в другой форме. Без него нечем спросить статус доставки (см. ниже).
		return { ok: true, providerId: body?.messageId ?? body?.id ?? body?.data?.messageId ?? body?.data?.id }
	} catch (e) {
		return { ok: false, code: 'NETWORK', error: e instanceof Error ? e.message : 'Ошибка сети' }
	}
}

/**
 * Состояние доставки ранее отправленной SMS.
 *
 * ⚠️ Зачем. Успешный ответ на отправку означает «шлюз принял», а не «абонент получил».
 * 2026-09-06 в кабинете InfiniReach четыре подряд уведомления так и остались в `sent`,
 * клиент не получил ничего, а наш журнал показывал «отправлено». Ровно та же ловушка,
 * что с `ack` у WhatsApp.
 *
 * `undefined` означает «подтвердить нечем» (провайдер без такого эндпоинта, сеть не
 * ответила), а НЕ «не доставлено».
 */
export type SmsDelivery = 'queued' | 'sent' | 'delivered' | 'failed'

/** Пауза между опросами: отчёт о доставке приходит от оператора не мгновенно. */
const SMS_PROBES_MS = [2000, 3000]

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Коды статусов SMSC (`status.php`).
 *   -3 не найдено · -2 остановлено · -1 ожидает отправки · 0 передано оператору
 *    1 доставлено · 2 прочитано · 3 просрочено · 4 нажата ссылка
 *   20 невозможно доставить · 22 неверный номер · 23 запрещено
 *   24 недостаточно средств · 25 недоступный номер
 *
 * «Нажата ссылка» (4) означает, что абонент не только получил сообщение, но и открыл
 * ссылку, поэтому это тоже доставка.
 */
const SMSC_DELIVERED = new Set([1, 2, 4])
const SMSC_FAILED = new Set([-3, 3, 20, 22, 23, 24, 25])

/**
 * @param providerId id сообщения у провайдера
 * @param phone номер получателя — SMSC требует его вместе с id, иначе статус не найти
 */
export async function smsDeliveryStatus(providerId?: string, phone?: string): Promise<SmsDelivery | undefined> {
	if (!providerId) return undefined

	for (const pause of SMS_PROBES_MS) {
		await sleep(pause)
		const status = await smsDeliveryProbe(providerId, phone)
		// `queued` и `sent` — ещё не итог: ждём следующей попытки.
		if (status === 'delivered' || status === 'failed') return status
		if (status === undefined) return undefined
	}
	return 'sent'
}

/**
 * Один запрос статуса, без пауз. Нужен обходу /api/notify/sweep: там строк может быть
 * несколько, и спать по несколько секунд на каждой нельзя — запрос не уложится в лимит
 * времени функции.
 */
export async function smsDeliveryProbe(providerId?: string, phone?: string): Promise<SmsDelivery | undefined> {
	if (!providerId) return undefined
	const provider = smsProvider()
	if (provider === 'smsc') return smscProbe(providerId, phone)
	if (provider === 'infinireach') return infiniReachProbe(providerId)
	return undefined
}

/**
 * ⚠️ SMSC не принимает больше пяти одинаковых запросов статуса по одному сообщению,
 * поэтому опрашиваем дважды здесь и не чаще раза за проход в /api/notify/sweep.
 * Статус доступен только сутки с момента отправки — дальше сообщение уходит в архив.
 */
async function smscProbe(providerId: string, phone?: string): Promise<SmsDelivery | undefined> {
	// SMSC ищет сообщение по паре «id + номер», без номера статус не найти.
	if (!phone) return undefined
	const url = `${SMSC_STATUS_URL}?${new URLSearchParams({
		apikey: process.env.SMSC_API_KEY as string,
		phone,
		id: providerId,
		fmt: '3',
	})}`

	try {
		const res = await fetch(url, { cache: 'no-store' })
		if (!res.ok) return undefined
		const body = (await safeJson(res)) as { status?: number; error?: string } | null
		if (!body || typeof body.status !== 'number') return undefined
		if (SMSC_DELIVERED.has(body.status)) return 'delivered'
		if (SMSC_FAILED.has(body.status)) return 'failed'
		// -1 «ожидает отправки» и 0 «передано оператору» — сообщение ещё в пути.
		return 'sent'
	} catch {
		// Не смогли спросить — это не повод объявлять отправку неудачной.
		return undefined
	}
}

async function infiniReachProbe(providerId: string): Promise<SmsDelivery | undefined> {
	try {
		const res = await fetch(`${INFINIREACH_URL}/${encodeURIComponent(providerId)}`, {
			headers: { 'X-API-Key': process.env.INFINIREACH_API_KEY as string },
			cache: 'no-store',
		})
		if (!res.ok) return undefined
		const body = (await safeJson(res)) as { status?: string; data?: { status?: string } } | null
		const status = (body?.status ?? body?.data?.status)?.toLowerCase()
		if (status === 'delivered' || status === 'failed') return status
		return 'sent'
	} catch {
		return undefined
	}
}

async function safeJson(res: Response): Promise<unknown> {
	try {
		const raw = await res.text()
		return raw ? JSON.parse(raw) : null
	} catch {
		return null
	}
}

function describe(body: unknown, status: number): string {
	const b = body as { message?: string; error?: string } | null
	return b?.message || b?.error || `SMS-шлюз ответил ${status}`
}
