import type { TranslationKey } from '@/lib/i18n'

export function formatDate(iso: string | null | undefined): string {
	if (!iso) return ''
	return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function toInputDate(iso: string | null | undefined): string {
	if (!iso) return ''
	return iso.substring(0, 10)
}

export function getCurrencySymbol(currency: string): string {
	return currency === 'RUB' ? '₽' : '₸'
}

export function displayTimeframe(value: string, t: (key: TranslationKey) => string): string {
	if (!value) return ''
	const [num, unit] = value.split('|')
	if (!unit) return value
	const key: TranslationKey = unit === 'weeks' ? 'unitWeeks' : unit === 'months' ? 'unitMonths' : 'unitDays'
	return `${num} ${t(key)}`
}
