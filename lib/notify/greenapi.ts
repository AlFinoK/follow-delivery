// WhatsApp через GREEN-API (green-api.com). Только сервер.
//
// Green-API — облачный сервис: номер привязывается к инстансу по QR один раз, дальше
// сессия живёт у них, телефон может быть выключен. Этим он и отличается от WAHA,
// которую мы держали сами: не нужен ни контейнер на VPS, ни публичный адрес с
// сертификатом. Подключение неофициальное, как и WAHA, поэтому риск блокировки номера
// остаётся — его гасят кэш проверок (ниже) и окно повторной отправки в send.ts.
//
// ⚠️ Главное отличие от WAHA, из-за которого пришлось менять схему: статус доставки
// НЕЛЬЗЯ опросить сразу после отправки. Журнал сообщений (`getMessage`) отстаёт до двух
// минут, и документация прямо отправляет за статусами в вебхук `outgoingMessageStatus`.
// Поэтому здесь нет аналога messageAck: доставку подтверждает вебхук, а если статуса
// нет совсем (клиент с заблокированным WhatsApp так и висит в `sent`), SMS досылается
// по таймауту из /api/notify/sweep.
//
// Переменные окружения:
//   GREENAPI_URL          — адрес API инстанса (выдаётся в кабинете)
//   GREENAPI_ID_INSTANCE  — номер инстанса
//   GREENAPI_TOKEN        — apiTokenInstance
//
// Настройки инстанса (задаются один раз через SetSettings, не из кода):
//   webhookUrl + webhookUrlToken  — наш /api/notify/webhook и его токен
//   outgoingAPIMessageWebhook=yes — иначе статусы отправленных нами сообщений не придут
//   keepOnlineStatus=yes          — иначе не приходит `delivered`

import { NotifyError, NOT_CONFIGURED, type SendResult } from './types'
import { digits } from './links'

const base = () => process.env.GREENAPI_URL?.trim().replace(/\/+$/, '') ?? ''

export function greenApiConfigured(): boolean {
	return !!(process.env.GREENAPI_URL?.trim() && process.env.GREENAPI_ID_INSTANCE?.trim() && process.env.GREENAPI_TOKEN?.trim())
}

/** Метод Green-API: {base}/waInstance{id}/{method}/{token}. */
async function call<T>(method: string, body: unknown): Promise<T> {
	if (!greenApiConfigured()) throw new NotifyError(NOT_CONFIGURED, 'Green-API не настроена')

	const url = `${base()}/waInstance${process.env.GREENAPI_ID_INSTANCE?.trim()}/${method}/${process.env.GREENAPI_TOKEN?.trim()}`
	const res = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
		cache: 'no-store',
	})

	const raw = await res.text()
	let parsed: unknown = null
	try {
		parsed = raw ? JSON.parse(raw) : null
	} catch {
		parsed = raw
	}

	if (!res.ok) {
		const b = parsed as { message?: string; error?: string } | string | null
		const msg = typeof b === 'string' ? b : b?.message || b?.error || `Green-API ответила ${res.status}`
		// 401/403 — неверный токен инстанса; 466 у Green-API означает исчерпанный лимит
		// тарифа, и путать его с «номер недоступен» нельзя.
		throw new NotifyError(res.status === 401 || res.status === 403 ? 'UNAUTHORIZED' : `HTTP_${res.status}`, msg)
	}
	return parsed as T
}

/**
 * Есть ли у номера WhatsApp — для Green-API вопрос БЕЗ ОТВЕТА, поэтому запроса нет.
 *
 * ⚠️ Проверено живыми запросами 2026-09-19: `checkWhatsapp` возвращает
 * `existsWhatsapp: true` на любой номер, включая заведомо несуществующие
 * (`77000000001`, `79990000001`) — и из кэша, и с `force: true`, который бьёт прямо в
 * WhatsApp. То есть метод отвечает не «номер зарегистрирован», а «вот его lid».
 * Похоже на приватность на стороне WhatsApp: наличие регистрации больше не раскрывают.
 *
 * Звать его ради ответа «true» бессмысленно и вредно: это лишнее обращение к WhatsApp
 * на каждое уведомление, а именно такие обращения Meta считает признаком неофициального
 * клиента (2026-08-26 номер компании уехал «на проверку»).
 *
 * Поэтому канал выбирается иначе, чем у WAHA: отправляем в WhatsApp всегда, а «у номера
 * нет WhatsApp» выясняется ПОСЛЕ отправки — статусом `noAccount` в вебхуке, а если
 * статуса не будет вовсе, сработает досылка SMS по таймауту в /api/notify/sweep.
 *
 * ⚠️ Заодно: `chatId` в этот метод надо передавать с суффиксом (`номер@c.us`), на голые
 * цифры он отвечает 400 — хотя в документации пример именно с цифрами.
 */
export async function checkNumberExists(): Promise<{ exists: boolean; chatId?: string }> {
	return { exists: true }
}

/**
 * Отправка текста. Возвращает `idMessage` — по нему вебхук статусов найдёт строку журнала.
 *
 * Отправляем на `<цифры>@c.us`, а не на chatId из проверки: у части номеров тот приходит
 * в формате `@lid`, а sendMessage в документации описан для `@c.us` и `@g.us`.
 */
export async function sendWhatsApp(phone: string, text: string): Promise<SendResult> {
	try {
		const body = await call<{ idMessage?: string }>('sendMessage', {
			chatId: `${digits(phone)}@c.us`,
			message: text,
		})
		return { ok: true, providerId: body?.idMessage }
	} catch (e) {
		if (e instanceof NotifyError) return { ok: false, code: e.code, error: e.message }
		return { ok: false, code: 'NETWORK', error: e instanceof Error ? e.message : 'Ошибка сети' }
	}
}
