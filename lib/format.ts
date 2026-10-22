import type { TranslationKey } from '@/lib/i18n'

export function formatDate(iso: string | null | undefined): string {
	if (!iso) return ''
	return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function toInputDate(iso: string | null | undefined): string {
	if (!iso) return ''
	return iso.substring(0, 10)
}

export function getCurrencySymbol(currency: string | null | undefined): string {
	return currency === 'RUB' ? '₽' : '₸'
}

/** Число с разделителями тысяч. Локаль задана явно: иначе SSR/клиент и языки браузера дают разный вид. */
export function formatNumber(n: number): string {
	return n.toLocaleString('ru-RU')
}

/** Неразрывный пробел: разделитель тысяч и отступ перед символом валюты — сумма не рвётся переносом строки. */
const NBSP = ' '

/**
 * Единый формат денег в интерфейсе: «107 500 ₸», «1 250,5 ₽» (ru-RU, разделитель тысяч и пробел
 * перед валютой — неразрывные U+00A0, не больше двух знаков после запятой).
 * currency — код из БД (`KZT` | `RUB`); пусто/неизвестно → ₸, как getCurrencySymbol.
 * null/undefined/NaN → пустая строка: «не указано» решает вызывающий код.
 *
 * НЕ для сводки логистам, PDF и текста WhatsApp: там заказчик требует формат с точками
 * («107.500 тенге») — это fmtMoney из lib/waybill/totals.ts (CLAUDE.md §11/§12).
 */
export function formatMoney(amount: number | null | undefined, currency?: string | null): string {
	if (amount == null || !Number.isFinite(amount)) return ''
	// ICU для ru-RU отдаёт то U+00A0, то U+202F (зависит от версии) — приводим к одному виду
	const num = amount.toLocaleString('ru-RU', { maximumFractionDigits: 2 }).replace(/\s/g, NBSP)
	return `${num}${NBSP}${getCurrencySymbol(currency)}`
}

/**
 * Разбор суммы, набранной человеком: «50 000», «50000,5», «1.500», «1 234.56».
 * Только цифры, пробелы, точки и запятые, иначе null. Один разделитель, за которым ровно три
 * цифры («1.500», «50,000»), считается разделителем тысяч — копейки в тенге так не пишут.
 */
export function parseHumanAmount(raw: string | null | undefined): number | null {
	if (raw == null) return null
	const s = raw.replace(/\s/g, '')
	if (!/^[\d.,]+$/.test(s) || !/\d/.test(s)) return null
	const seps = s.match(/[.,]/g) ?? []
	let normalized: string
	if (seps.length === 0) {
		normalized = s
	} else {
		const kinds = new Set(seps)
		const lastIdx = Math.max(s.lastIndexOf('.'), s.lastIndexOf(','))
		const tail = s.slice(lastIdx + 1)
		if (kinds.size === 2) {
			// «1.234,56» / «1,234.56»: последний разделитель — дробный, остальные — тысячи
			normalized = s.slice(0, lastIdx).replace(/[.,]/g, '') + '.' + tail
		} else if (seps.length > 1 || tail.length === 3) {
			// «1.234.567», «50,000» — тысячи
			normalized = s.replace(/[.,]/g, '')
		} else {
			normalized = s.slice(0, lastIdx) + '.' + tail
		}
	}
	if (/^\.|\.$/.test(normalized)) return null
	const n = Number(normalized)
	return Number.isFinite(n) ? n : null
}

/**
 * «Детали оплаты» частичной оплаты — свободный текст. Валюту дописываем, только если там
 * одно число («50000» → «50 000 ₸»); текст вроде «Оплачено 50 000 ₸» показываем как есть,
 * иначе получалось «Оплачено 50 000 ₸ ₸». Пусто → ''.
 */
export function formatPaymentDetail(detail: string | null | undefined, currency?: string | null): string {
	const text = (detail ?? '').trim()
	if (!text) return ''
	const n = parseHumanAmount(text)
	return n == null ? text : formatMoney(n, currency)
}

export function displayTimeframe(value: string, t: (key: TranslationKey) => string): string {
	if (!value) return ''
	const [num, unit] = value.split('|')
	if (!unit) return value
	const key: TranslationKey = unit === 'weeks' ? 'unitWeeks' : unit === 'months' ? 'unitMonths' : 'unitDays'
	return `${num} ${t(key)}`
}

/**
 * Подстановка {key} в строку перевода. Один проход по шаблону: значение, содержащее `$&`,
 * `$'` или `{другой_ключ}`, вставляется как есть; повторные плейсхолдеры заменяются все,
 * неизвестные остаются нетронутыми.
 */
export function interpolate(template: string, params: Record<string, string | number>): string {
	return template.replace(/\{([^{}]+)\}/g, (match, key: string) =>
		Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : match,
	)
}

/** fetch, прерванный через AbortController, — не ошибка загрузки: устаревший запрос игнорируем молча. */
export function isAbortError(e: unknown): boolean {
	return typeof e === 'object' && e !== null && (e as { name?: unknown }).name === 'AbortError'
}

/** Номер страницы из query: мусор, дроби, ноль и минус → 1. Верхняя граница страхует от абсурдных значений. */
export function parsePageParam(raw: string | null | undefined): number {
	if (!raw || !/^\d{1,7}$/.test(raw.trim())) return 1
	const n = Number(raw.trim())
	return n >= 1 ? n : 1
}

/**
 * Безопасный внутренний путь для редиректа (returnTo / callbackUrl).
 * Принимает только «/путь»: не «//host» (protocol-relative), без обратного слэша
 * (браузеры считают его слэшем) и управляющих символов (таб/перенос вырезаются из URL,
 * и «/\t/evil.com» превращается в «//evil.com»). Иначе — fallback.
 */
export function safeLocalPath(raw: string | null | undefined, fallback = '/admin'): string {
	if (typeof raw !== 'string' || !raw.startsWith('/') || raw.startsWith('//')) return fallback
	if (raw.includes('\\')) return fallback
	for (let i = 0; i < raw.length; i++) {
		const c = raw.charCodeAt(i)
		if (c < 0x20 || c === 0x7f) return fallback
	}
	return raw
}
