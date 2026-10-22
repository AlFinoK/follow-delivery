import type { TranslationKey } from '@/lib/i18n'

// Единый источник подписи и цветов статуса груза (раньше было три копии: список,
// карточка, публичный результат). Статусы в БД — русские строки (CLAUDE.md, ловушка №2).
// Публичная страница всегда светлая (.dark на ней не вешается), поэтому dark:-классы там безвредны.

export type CargoStatusKind = 'waiting' | 'transit' | 'arrived' | 'unknown'

export interface StatusUi {
	kind: CargoStatusKind
	label: string
	/** Классы бейджа: фон + текст + рамка. */
	cls: string
	/** Цвет точки-индикатора. */
	dot: string
}

export function statusKind(status: string | null | undefined): CargoStatusKind {
	if (status === 'ожидает отправления') return 'waiting'
	if (status === 'в пути') return 'transit'
	if (status === 'прибыл') return 'arrived'
	return 'unknown'
}

const STYLES: Record<CargoStatusKind, { cls: string; dot: string; labelKey: TranslationKey | null }> = {
	waiting: {
		cls: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/25',
		dot: 'bg-amber-500',
		labelKey: 'statusWaiting',
	},
	transit: {
		cls: 'bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/25',
		dot: 'bg-blue-500',
		labelKey: 'statusInTransit',
	},
	arrived: {
		cls: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/25',
		dot: 'bg-emerald-500',
		labelKey: 'statusArrived',
	},
	unknown: {
		cls: 'bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-700',
		dot: 'bg-slate-400',
		labelKey: null,
	},
}

export function getStatusUi(status: string, t: (key: TranslationKey) => string): StatusUi {
	const kind = statusKind(status)
	const s = STYLES[kind]
	return { kind, label: s.labelKey ? t(s.labelKey) : status, cls: s.cls, dot: s.dot }
}

const sameCity = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

/**
 * Текущий город в строке списка показываем, только если он отличается и от отправления, и от
 * назначения: «Алматы → 📍Алматы → Москва» дублировал точку отправления и путал операторов.
 */
export function showCurrentCity(cargo: { fromCity: string; currentCity: string | null | undefined; toCity: string }): boolean {
	const cur = cargo.currentCity?.trim()
	return !!cur && !sameCity(cur, cargo.fromCity ?? '') && !sameCity(cur, cargo.toCity ?? '')
}

// Статус оплаты груза: none | partial | full (CLAUDE.md, ловушка №2). Неизвестное → none.
export type PaymentKind = 'none' | 'partial' | 'full'

export interface PaymentUi {
	kind: PaymentKind
	/** Полная подпись: «Частичная оплата». */
	label: string
	/** Короткая — для бейджа в строке списка: «Частично». */
	short: string
	/** Классы бейджа: фон + текст + рамка. */
	cls: string
}

const PAYMENT_STYLES: Record<PaymentKind, { cls: string; labelKey: TranslationKey; shortKey: TranslationKey }> = {
	none: {
		cls: 'bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-700',
		labelKey: 'paymentNone',
		shortKey: 'payShortNone',
	},
	partial: {
		cls: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/25',
		labelKey: 'paymentPartial',
		shortKey: 'payShortPartial',
	},
	full: {
		cls: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/25',
		labelKey: 'paymentFull',
		shortKey: 'payShortFull',
	},
}

export function getPaymentUi(paymentStatus: string | null | undefined, t: (key: TranslationKey) => string): PaymentUi {
	const kind: PaymentKind = paymentStatus === 'full' || paymentStatus === 'partial' ? paymentStatus : 'none'
	const s = PAYMENT_STYLES[kind]
	return { kind, label: t(s.labelKey), short: t(s.shortKey), cls: s.cls }
}
