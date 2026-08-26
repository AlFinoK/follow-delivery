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
		const body = (await safeJson(res)) as { id?: string; data?: { id?: string }; message?: string; error?: string } | null
		if (!res.ok) return { ok: false, code: `HTTP_${res.status}`, error: describe(body, res.status) }
		return { ok: true, providerId: body?.id ?? body?.data?.id }
	} catch (e) {
		return { ok: false, code: 'NETWORK', error: e instanceof Error ? e.message : 'Ошибка сети' }
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
