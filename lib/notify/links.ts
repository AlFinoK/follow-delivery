// Ссылка для РУЧНОЙ отправки — фолбэк, когда провайдер WhatsApp не настроен. Оператор
// жмёт кнопку, открывается WhatsApp с уже подставленным текстом, отправку подтверждает
// он сам.
//
// Модуль сознательно без серверных зависимостей: его импортирует клиентская
// NotifyModal, чтобы показать ту же ссылку без запроса к серверу.

/** E.164 (+77021234567) → только цифры: формат chatId и wa.me. */
export function digits(phone: string): string {
	return (phone || '').replace(/\D/g, '')
}

/**
 * Телефон в E.164, грубая проверка. Намеренно НЕ isPhoneValid из model.ts: тот тянет
 * react-phone-number-input, который ломает вычисление модуля на сервере (см. totals.ts).
 * Подробную проверку клиент делает до сохранения; здесь — страховка для API.
 */
export const looksLikePhone = (phone: string): boolean => /^\+\d{10,15}$/.test((phone || '').trim())

/** Ссылка «написать в WhatsApp» с готовым текстом. */
export function whatsappLink(phone: string, text: string): string {
	return `https://wa.me/${digits(phone)}?text=${encodeURIComponent(text)}`
}
