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
 * Кэш ответов checkWhatsapp. Проверка номера — обращение к WhatsApp, а не локальная
 * операция, и именно такие обращения Meta считает признаком неофициального клиента
 * (2026-08-26 номер компании уехал «на проверку» после серии переподключений).
 *
 * Кэш живёт в памяти процесса: на Vercel он свой у каждого инстанса, и это нормально —
 * задача не «сэкономить запрос любой ценой», а убрать очевидные повторы.
 */
const existsCache = new Map<string, { exists: boolean; chatId?: string; at: number }>()
const EXISTS_TTL_MS = 6 * 60 * 60 * 1000

/**
 * Есть ли у номера WhatsApp.
 *
 * `chatId` передаём цифрами: поле принимает и `79001234567`, и `…@c.us`, а `phoneNumber`
 * в документации помечено устаревшим. `force` не ставим — по умолчанию Green-API
 * отвечает из своего кэша, и это ещё один пропущенный запрос к WhatsApp.
 */
export async function checkNumberExists(phone: string): Promise<{ exists: boolean; chatId?: string }> {
	const key = digits(phone)
	const hit = existsCache.get(key)
	if (hit && Date.now() - hit.at < EXISTS_TTL_MS) return { exists: hit.exists, chatId: hit.chatId }

	const res = await call<{ existsWhatsapp?: boolean; chatId?: string }>('checkWhatsapp', { chatId: key })
	const out = { exists: res?.existsWhatsapp === true, chatId: res?.chatId ?? undefined }
	existsCache.set(key, { ...out, at: Date.now() })
	return out
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
