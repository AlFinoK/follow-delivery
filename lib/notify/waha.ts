// WhatsApp через WAHA (WhatsApp HTTP API, github.com/devlikeapro/waha). Только сервер.
//
// WAHA — self-hosted контейнер, который подключается к WhatsApp как WhatsApp Web по QR.
// Номер компании остаётся у компании, приложение WhatsApp Business на нём продолжает
// работать, верификация Meta и утверждение шаблонов не нужны. С версии 2026.6.1 все
// возможности бесплатны (образ `devlikeapro/waha`), подписка Patreon — только поддержка.
//
// ⚠️ WAHA НЕ живёт на Vercel: это Docker-контейнер, ему нужен VPS. Приложение обращается
// к нему по сети, поэтому WAHA_URL должен быть доступен из окружения приложения, а
// WAHA_API_KEY обязателен, если контейнер смотрит в интернет.
//
// Главное отличие от Wazzup, из-за которого архитектура проще: у WAHA ЕСТЬ синхронная
// проверка «есть ли у номера WhatsApp» — GET /api/contacts/check-exists. Поэтому канал
// выбирается ДО отправки, и SMS-фолбэк не зависит от вебхука.

import { NotifyError, NOT_CONFIGURED, type SendResult } from './types'
import { digits } from './links'

/** Сессия WAHA, с которой работаем. Одна на компанию — один номер. */
const session = () => process.env.WAHA_SESSION?.trim() || 'default'

export function wahaConfigured(): boolean {
	return !!process.env.WAHA_URL?.trim()
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
	const base = process.env.WAHA_URL?.trim().replace(/\/+$/, '')
	if (!base) throw new NotifyError(NOT_CONFIGURED, 'Не задан WAHA_URL')

	const key = process.env.WAHA_API_KEY?.trim()
	const res = await fetch(`${base}${path}`, {
		...init,
		headers: {
			'Content-Type': 'application/json',
			...(key ? { 'X-Api-Key': key } : {}),
			...(init?.headers ?? {}),
		},
		cache: 'no-store',
	})

	const raw = await res.text()
	let body: unknown = null
	try {
		body = raw ? JSON.parse(raw) : null
	} catch {
		body = raw
	}

	if (!res.ok) {
		const b = body as { message?: string | string[]; error?: string } | string | null
		const msg =
			typeof b === 'string'
				? b
				: Array.isArray(b?.message)
					? b.message.join('; ')
					: b?.message || b?.error || `WAHA ответил ${res.status}`
		throw new NotifyError(res.status === 401 || res.status === 403 ? 'UNAUTHORIZED' : `HTTP_${res.status}`, msg)
	}
	return body as T
}

/**
 * Готова ли сессия к отправке. Самая частая причина «ничего не уходит» — сессия
 * отвалилась и ждёт повторного сканирования QR, поэтому статус показываем оператору
 * как есть, а не прячем за общей ошибкой.
 */
export async function sessionReady(): Promise<{ ok: boolean; status: string }> {
	const s = await call<{ status?: string }>(`/api/sessions/${encodeURIComponent(session())}`)
	const status = s?.status ?? 'UNKNOWN'
	return { ok: status === 'WORKING', status }
}

/**
 * Кэш ответов check-exists. Каждая проверка — это ЗАПРОС В WHATSAPP, а не локальная
 * операция, и именно такие обращения Meta считает признаком неофициального клиента
 * (2026-08-26 номер компании уехал «на проверку» после серии переподключений).
 * Повторные уведомления по одному и тому же номеру больше WhatsApp не беспокоят.
 *
 * Кэш живёт в памяти процесса: на Vercel он свой у каждого инстанса, и это нормально —
 * задача не «сэкономить запрос любой ценой», а убрать очевидные повторы.
 */
const existsCache = new Map<string, { exists: boolean; chatId?: string; at: number }>()
const EXISTS_TTL_MS = 6 * 60 * 60 * 1000

/**
 * Есть ли у номера WhatsApp. Возвращает и chatId — документация WAHA прямо советует
 * брать его отсюда, а не собирать самому: у части номеров идентификатор приходит в
 * формате @lid, а не @c.us.
 *
 * `phone` передаём только цифрами: с ведущим «+» эндпоинт отвечает 500.
 */
export async function checkNumberExists(phone: string): Promise<{ exists: boolean; chatId?: string }> {
	const key = digits(phone)
	const hit = existsCache.get(key)
	if (hit && Date.now() - hit.at < EXISTS_TTL_MS) return { exists: hit.exists, chatId: hit.chatId }

	const res = await call<{ numberExists?: boolean; chatId?: string; pn?: string }>(
		`/api/contacts/check-exists?phone=${encodeURIComponent(key)}&session=${encodeURIComponent(session())}`
	)
	const out = { exists: res?.numberExists === true, chatId: res?.chatId ?? res?.pn ?? undefined }
	existsCache.set(key, { ...out, at: Date.now() })
	return out
}

/**
 * id отправленного сообщения. Форма ответа зависит от движка (WEBJS отдаёт объект с
 * `_serialized`, NOWEB — `key.id`), поэтому разбираем защитно: id нужен, чтобы вебхук
 * message.ack нашёл строку журнала.
 */
function messageId(body: unknown): string | undefined {
	const b = body as { id?: string | { _serialized?: string }; key?: { id?: string } } | null
	if (!b) return undefined
	if (typeof b.id === 'string') return b.id
	if (b.id && typeof b.id === 'object' && typeof b.id._serialized === 'string') return b.id._serialized
	return typeof b.key?.id === 'string' ? b.key.id : undefined
}

/**
 * Подтверждение доставки: ack отправленного сообщения.
 *   -1 ERROR · 0 PENDING · 1 SERVER · 2 DEVICE · 3 READ
 * `undefined` — статус выяснить не удалось (сообщение ещё в очереди, WAHA не ответила).
 *
 * ⚠️ Зачем это вообще нужно. `POST /api/sendText` отвечает 201, как только WAHA приняла
 * сообщение, — это НЕ доставка. WhatsApp может отклонить его позже и молча: 2026-08-27
 * аккаунт стоял под ограничением `RESTRICT_ALL_COMPANIONS`, каждое сообщение получало
 * `error 463: account restricted`, и журнал показывал «отправлено» при неполученном
 * клиентом сообщении. Штатно такое ловит вебхук `message.ack`, но он необязателен и
 * легко оказывается недонастроенным — тогда страховки нет вообще.
 *
 * Это ЧТЕНИЕ ИЗ ХРАНИЛИЩА САМОЙ WAHA, а не обращение к WhatsApp: на лимиты аккаунта
 * не влияет, в отличие от `check-exists`.
 *
 * Опрашиваем несколько раз с паузами: ack проставляется асинхронно, сразу после
 * отправки там закономерно 0 (PENDING). Пауз три и они короткие — суммарно ~5,5 с,
 * потому что вызов происходит внутри HTTP-запроса оператора (см. maxDuration в роуте).
 */
const ACK_PROBES_MS = [1200, 1800, 2500]

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function messageAck(chatId: string, messageId?: string): Promise<number | undefined> {
	if (!messageId) return undefined
	// Движки отдают id в разной форме, и ответ на отправку может отличаться от того,
	// что лежит в истории чата («true_7705…@c.us_3EB08…»), — сверяем ещё и по хвосту.
	const tail = messageId.split('_').pop()

	for (const pause of ACK_PROBES_MS) {
		await sleep(pause)
		try {
			const list = await call<Array<{ id?: string; ack?: number }>>(
				`/api/${encodeURIComponent(session())}/chats/${encodeURIComponent(chatId)}/messages?limit=10&downloadMedia=false`
			)
			const hit = Array.isArray(list) ? list.find((m) => m.id === messageId || m.id?.split('_').pop() === tail) : undefined
			// 0 (PENDING) — ещё не итог, ждём следующую попытку.
			if (typeof hit?.ack === 'number' && hit.ack !== 0) return hit.ack
		} catch {
			// Не смогли прочитать — это не повод объявлять отправку неудачной.
			return undefined
		}
	}
	return undefined
}

/** Отправка текста. chatId лучше передавать из checkNumberExists (см. выше). */
export async function sendWhatsApp(phone: string, text: string, chatId?: string): Promise<SendResult> {
	try {
		const ready = await sessionReady()
		if (!ready.ok) {
			throw new NotifyError('SESSION_NOT_READY', `Сессия WhatsApp не готова к отправке (статус: ${ready.status})`)
		}
		const body = await call<unknown>('/api/sendText', {
			method: 'POST',
			body: JSON.stringify({
				session: session(),
				chatId: chatId || `${digits(phone)}@c.us`,
				text,
			}),
		})
		return { ok: true, providerId: messageId(body) }
	} catch (e) {
		if (e instanceof NotifyError) return { ok: false, code: e.code, error: e.message }
		return { ok: false, code: 'NETWORK', error: e instanceof Error ? e.message : 'Ошибка сети' }
	}
}
