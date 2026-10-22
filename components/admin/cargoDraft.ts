import { toInputDate } from '@/lib/format'
import type { CargoPatch } from '@/lib/data/types'
import type { Cargo } from './types'

// Черновик правки груза (строки из полей формы) и чистая логика вокруг него —
// вынесено из CargoDetailPage, чтобы покрыть тестами.

export interface DraftState {
	cargoNumber: string
	name: string
	fromCity: string
	currentCity: string
	toCity: string
	acceptanceDate: string
	shipmentDate: string
	deliveryTimeframe: string
	deliveryAmount: string
	currency: string
	paymentStatus: string
	partialPaymentDetail: string
	status: string
}

export function cargoToDraft(cargo: Cargo): DraftState {
	return {
		cargoNumber: cargo.cargoNumber != null ? String(cargo.cargoNumber) : '',
		name: cargo.name ?? '',
		fromCity: cargo.fromCity,
		currentCity: cargo.currentCity,
		toCity: cargo.toCity,
		acceptanceDate: toInputDate(cargo.acceptanceDate),
		shipmentDate: toInputDate(cargo.shipmentDate),
		deliveryTimeframe: cargo.deliveryTimeframe ?? '',
		deliveryAmount: cargo.deliveryAmount?.toString() ?? '',
		currency: cargo.currency ?? 'KZT',
		paymentStatus: cargo.paymentStatus ?? 'none',
		partialPaymentDetail: cargo.partialPaymentDetail ?? '',
		status: cargo.status,
	}
}

/** Полная нормализованная нагрузка PATCH из черновика (то, что раньше уходило целиком). */
export function draftToPayload(d: DraftState): Required<Omit<CargoPatch, 'folderId'>> {
	return {
		cargoNumber: d.cargoNumber.trim() ? Number(d.cargoNumber.trim()) : null,
		name: d.name.trim() || null,
		fromCity: d.fromCity.trim(),
		currentCity: d.currentCity.trim(),
		toCity: d.toCity.trim(),
		status: d.status,
		acceptanceDate: d.acceptanceDate || null,
		shipmentDate: d.shipmentDate || null,
		deliveryTimeframe: d.deliveryTimeframe || null,
		deliveryAmount: d.deliveryAmount ? Number(d.deliveryAmount) : null,
		currency: d.currency,
		paymentStatus: d.paymentStatus,
		partialPaymentDetail: d.paymentStatus === 'partial' ? d.partialPaymentDetail || null : null,
	}
}

/**
 * Только изменённые относительно `base` поля. Отправка всего черновика откатывала бы то,
 * что параллельно поменяли массовое обновление папки или синхронизация накладной
 * (delivered → «прибыл»): оператор открыл карточку час назад, а PATCH затирал бы статус.
 * Пустой объект — менять нечего.
 */
export function buildCargoPatch(base: DraftState, draft: DraftState): CargoPatch {
	const before = draftToPayload(base)
	const after = draftToPayload(draft)
	const patch: Record<string, unknown> = {}
	for (const key of Object.keys(after) as (keyof typeof after)[]) {
		if (after[key] !== before[key]) patch[key] = after[key]
	}
	// Сумма частичной оплаты зависит от статуса оплаты: меняется статус — отправляем её согласованно.
	if ('paymentStatus' in patch) patch.partialPaymentDetail = after.partialPaymentDetail
	return patch as CargoPatch
}

/** Максимальный Int PostgreSQL (колонка cargoNumber). */
export const MAX_CARGO_NUMBER = 2147483647

/**
 * Ввод номера груза: только положительное целое ≤ 2147483647 (без «1e2», дробей, минуса, нуля).
 * Недопустимое изменение отбрасывается — в поле остаётся предыдущее значение.
 */
export function sanitizeCargoNumberInput(next: string, prev: string): string {
	if (next === '') return ''
	if (!/^[1-9]\d{0,9}$/.test(next)) return prev
	return Number(next) <= MAX_CARGO_NUMBER ? next : prev
}
