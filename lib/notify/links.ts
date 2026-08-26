// Ссылки для РУЧНОЙ отправки — фолбэк, когда автоматический провайдер не настроен
// (нет WAZZUP_API_KEY / SMS-шлюза). Оператор жмёт кнопку, открывается WhatsApp или
// SMS-приложение с уже подставленным текстом, отправку подтверждает он сам.
//
// Модуль сознательно без серверных зависимостей: его импортирует клиентская
// NotifyModal, чтобы показать те же ссылки без запроса к серверу.

/** E.164 (+77021234567) → только цифры: формат chatId у Wazzup и wa.me. */
export function digits(phone: string): string {
	return (phone || '').replace(/\D/g, '')
}

/** Ссылка «написать в WhatsApp» с готовым текстом. */
export function whatsappLink(phone: string, text: string): string {
	return `https://wa.me/${digits(phone)}?text=${encodeURIComponent(text)}`
}

/**
 * Ссылка «отправить SMS» с готовым текстом. `?&body=` — не опечатка: без пустого
 * первого параметра iOS обрезает тело сообщения.
 */
export function smsLink(phone: string, text: string): string {
	return `sms:${phone}?&body=${encodeURIComponent(text)}`
}

/**
 * Сколько SMS-частей займёт текст. Кириллица уходит в UCS-2: 70 символов на одну
 * SMS и 67 на часть в составном сообщении — поэтому короткий текст для SMS
 * ([message.ts]) не роскошь, а экономия.
 */
export function smsParts(text: string): number {
	const len = text.length
	// Любой символ вне ASCII (то есть кириллица) переводит SMS в UCS-2.
	const unicode = Array.from(text).some((ch) => ch.charCodeAt(0) > 127)
	const single = unicode ? 70 : 160
	const part = unicode ? 67 : 153
	if (len <= single) return 1
	return Math.ceil(len / part)
}
