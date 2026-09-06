// SMS-фолбэк: отправка, когда у номера получателя нет WhatsApp.
//
// Требование заказчика — SMS должны уходить С ЕГО НОМЕРА (8 708 703 77 11). Обычные
// шлюзы (Mobizon, SMSC) так не умеют: в SMS отправитель — это зарегистрированное у
// оператора альфа-имя, мобильный номер туда подставить нельзя. Единственный способ —
// шлюз на телефоне с этой SIM: приложение принимает HTTP-запрос и отправляет обычную
// SMS. Поддержаны два таких приложения, оба open-source:
//
//   SMS_PROVIDER=smsgate     → SMS Gateway for Android (sms-gate.app), Basic-авторизация
//   SMS_PROVIDER=httpsms     → httpSMS (httpsms.com), ключ в заголовке x-api-key
//   SMS_PROVIDER=infinireach → InfiniReach (infinireach.io), ключ в X-API-Key
//   SMS_PROVIDER не задан    → отправки нет, оператор получает ссылку sms: и жмёт сам
//
// Плата за сами SMS идёт по тарифу SIM-карты. Цена: телефон должен быть включён и
// онлайн, и он же остаётся единственной точкой отказа канала.
//
// ⚠️ Обычный шлюз с альфа-именем (Mobizon, SMSC) для этого проекта НЕ подходит:
// получатели в РФ, а туда такие шлюзы шлют только после регистрации собственного
// имени отправителя у российских операторов — это ~35 000 ₸/мес и месяц оформления.
// Абонентская SIM отправляет в Россию как обычное международное SMS, без всего этого.

import { NOT_CONFIGURED, type SendResult } from './types'

type Provider = 'smsgate' | 'httpsms' | 'infinireach' | 'none'

const SMSGATE_DEFAULT_URL = 'https://api.sms-gate.app/3rdparty/v1'
const HTTPSMS_URL = 'https://api.httpsms.com/v1/messages/send'
const INFINIREACH_URL = 'https://api.infinireach.io/api/v1/messages'

export function smsProvider(): Provider {
	const raw = process.env.SMS_PROVIDER?.trim().toLowerCase()
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
 * ⚠️ Зачем. Успешный ответ на отправку означает «шлюз принял», а не «абонент получил»:
 * телефон-шлюз отдаёт сообщение оператору и рапортует `sent`, после чего оператор может
 * его не доставить — при нулевом балансе SIM или антиспам-блокировке. 2026-09-06 в
 * кабинете InfiniReach четыре подряд уведомления так и остались в `sent`, а клиент не
 * получил ничего, при этом наш журнал показывал «отправлено». Ровно та же ловушка, что
 * с `ack` у WhatsApp (см. waha.ts).
 *
 * Статус выясняется только у InfiniReach: у остальных провайдеров такого эндпоинта нет,
 * и для них возвращается `undefined` — то есть «подтвердить нечем», а не «не доставлено».
 */
export type SmsDelivery = 'queued' | 'sent' | 'delivered' | 'failed'

/** Пауза между опросами: отчёт о доставке приходит от оператора не мгновенно. */
const SMS_PROBES_MS = [2000, 3000]

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function smsDeliveryStatus(providerId?: string): Promise<SmsDelivery | undefined> {
	if (!providerId || smsProvider() !== 'infinireach') return undefined

	for (const pause of SMS_PROBES_MS) {
		await sleep(pause)
		try {
			const res = await fetch(`${INFINIREACH_URL}/${encodeURIComponent(providerId)}`, {
				headers: { 'X-API-Key': process.env.INFINIREACH_API_KEY as string },
				cache: 'no-store',
			})
			if (!res.ok) return undefined
			const body = (await safeJson(res)) as { status?: string; data?: { status?: string } } | null
			const status = (body?.status ?? body?.data?.status)?.toLowerCase()
			// `queued` и `sent` — ещё не итог: ждём следующей попытки.
			if (status === 'delivered' || status === 'failed') return status
		} catch {
			// Не смогли спросить — это не повод объявлять отправку неудачной.
			return undefined
		}
	}
	return 'sent'
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
