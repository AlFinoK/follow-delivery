import type { TranslationKey } from '@/lib/i18n'

// Машинные коды ошибок уведомлений → ключи словаря.
//
// Сервер отдаёт и `code`, и русский `error`. Казахскому оператору русскую строку
// показывать нельзя, поэтому интерфейс переводит по коду, а сырой текст остаётся
// только для кодов, которых здесь нет (новые провайдеры, нестандартные сбои).
// Коды — см. lib/notify/types.ts, send.ts, greenapi.ts, http.ts. BAD_CONTACT и
// CHECK_FAILED у Green-API сейчас не возникают, но остаются в старых строках журнала.

const CODE_KEYS: Record<string, TranslationKey> = {
	NOT_CONFIGURED: 'neNotConfigured',
	BAD_CONTACT: 'neBadContact',
	RECENTLY_SENT: 'neRecentlySent',
	DELIVERY_FAILED: 'neDeliveryFailed',
	CHECK_FAILED: 'neCheckFailed',
	UNAUTHORIZED: 'neUnauthorized',
	NETWORK: 'neNetwork',
	TIMEOUT: 'neTimeout',
	// Коды автоуведомления при сохранении накладной (lib/notify/auto.ts).
	BAD_PHONE: 'neBadPhone',
	NO_CARGO: 'neNoCargo',
	SEND_ERROR: 'neProvider',
}

/** Ключ перевода для кода или null, если код неизвестен. `HTTP_5xx` и прочие — общая ошибка сервиса. */
export function notifyErrorKey(code?: string | null): TranslationKey | null {
	if (!code) return null
	if (CODE_KEYS[code]) return CODE_KEYS[code]
	if (/^HTTP_\d{3}$/.test(code)) return 'neProvider'
	return null
}

/**
 * Журнал хранит ошибку строкой «КОД: сообщение» (см. finish() в send.ts) — разбираем её
 * обратно. Если префикса-кода нет, вся строка считается сообщением.
 */
export function splitJournalError(raw?: string | null): { code?: string; message?: string } {
	if (!raw) return {}
	const m = /^([A-Z][A-Z0-9_]{2,}):\s*([\s\S]*)$/.exec(raw)
	if (m) return { code: m[1], message: m[2] || undefined }
	return { message: raw }
}

/**
 * Текст ошибки для интерфейса. Известный код — перевод; иначе сырое сообщение сервера;
 * иначе общий текст `fallback`.
 */
export function notifyErrorText(
	t: (key: TranslationKey) => string,
	code: string | null | undefined,
	raw: string | null | undefined,
	fallback: string
): string {
	const key = notifyErrorKey(code)
	if (key) return t(key)
	return raw || fallback
}
