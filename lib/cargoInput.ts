// Разбор и проверка тела запроса для Cargo (POST /api/cargos и PATCH /api/cargos/[id]).
// Только сервер. Возвращает либо готовый `data` для Prisma, либо текст ошибки для 400.
//
// Раньше значения уходили в Prisma как есть: «Invalid Date», строка вместо числа,
// Number('abc') = NaN в Int-колонке и произвольные статусы давали 500 либо — хуже —
// молча записывали мусор (статус «шмель» ломал фильтры и счётчики списка).

import { safeInt } from './apiUtil'

/** Допустимые значения хранятся по-русски (CLAUDE.md §2) — сравниваем именно с ними. */
export const CARGO_STATUSES = ['ожидает отправления', 'в пути', 'прибыл'] as const
export const PAYMENT_STATUSES = ['none', 'partial', 'full'] as const
export const CURRENCIES = ['KZT', 'RUB'] as const

export const isCargoStatus = (v: unknown): v is (typeof CARGO_STATUSES)[number] =>
	typeof v === 'string' && (CARGO_STATUSES as readonly string[]).includes(v)

const MAX_TEXT = 300
const MAX_TRACKING_ID = 100
// Границы дат: Postgres timestamp принимает и 4713 до н.э., но осмысленные даты — вокруг «сейчас».
const MIN_DATE = Date.UTC(1900, 0, 1)
const MAX_DATE = Date.UTC(2200, 0, 1)

type Raw = Record<string, unknown>
export type CargoData = Record<string, string | number | Date | null>
export type ParseResult = { data: CargoData } | { error: string }

const isEmpty = (v: unknown) => v === null || v === undefined || v === ''

/** Строка (обрезанная) либо ошибка. */
function text(v: unknown, label: string, required: boolean): string | null | { error: string } {
	if (isEmpty(v)) return required ? { error: `Поле «${label}» обязательно` } : null
	if (typeof v !== 'string') return { error: `Некорректное значение поля «${label}»` }
	const s = v.trim()
	if (!s) return required ? { error: `Поле «${label}» обязательно` } : null
	if (s.length > MAX_TEXT) return { error: `Поле «${label}» слишком длинное` }
	if (s.includes('\u0000')) return { error: `Некорректное значение поля «${label}»` }
	return s
}

function date(v: unknown, label: string): Date | null | { error: string } {
	if (isEmpty(v)) return null
	if (typeof v !== 'string' && typeof v !== 'number') return { error: `Некорректная дата: ${label}` }
	const d = new Date(v)
	const t = d.getTime()
	if (Number.isNaN(t) || t < MIN_DATE || t > MAX_DATE) return { error: `Некорректная дата: ${label}` }
	return d
}

const isErr = (v: unknown): v is { error: string } => typeof v === 'object' && v !== null && !(v instanceof Date) && 'error' in v

/**
 * mode 'create' — все обязательные поля на месте, остальным подставляются значения по умолчанию;
 * mode 'patch'  — берутся только переданные поля (undefined = «не трогать»).
 * trackingId (body.id) и folderId разбираются вызывающим: они требуют обращения к базе.
 */
export function parseCargoInput(body: Raw, mode: 'create' | 'patch'): ParseResult {
	const data: CargoData = {}
	const create = mode === 'create'
	const has = (k: string) => create || body[k] !== undefined

	for (const [key, label] of [
		['fromCity', 'Откуда'],
		['toCity', 'Куда'],
		['currentCity', 'Текущий город'],
	] as const) {
		if (!has(key)) continue
		const v = text(body[key], label, true)
		if (isErr(v)) return v
		data[key] = v as string
	}

	if (has('status')) {
		if (!isCargoStatus(body.status)) return { error: 'Недопустимый статус груза' }
		data.status = body.status
	}

	if (has('paymentStatus')) {
		const v = isEmpty(body.paymentStatus) && create ? 'none' : body.paymentStatus
		if (typeof v !== 'string' || !(PAYMENT_STATUSES as readonly string[]).includes(v)) {
			return { error: 'Недопустимый статус оплаты' }
		}
		data.paymentStatus = v
	}

	if (has('currency')) {
		const v = isEmpty(body.currency) && create ? 'KZT' : body.currency
		if (typeof v !== 'string' || !(CURRENCIES as readonly string[]).includes(v)) {
			return { error: 'Недопустимая валюта' }
		}
		data.currency = v
	}

	if (has('cargoNumber')) {
		if (isEmpty(body.cargoNumber)) data.cargoNumber = null
		else {
			const n = safeInt(body.cargoNumber)
			if (n === null) return { error: 'Некорректный номер груза' }
			data.cargoNumber = n
		}
	}

	if (has('name')) {
		const v = text(body.name, 'Название', false)
		if (isErr(v)) return v
		data.name = v
	}

	if (has('partialPaymentDetail')) {
		const v = text(body.partialPaymentDetail, 'Детали оплаты', false)
		if (isErr(v)) return v
		data.partialPaymentDetail = v
	}

	if (has('deliveryTimeframe')) {
		const v = text(body.deliveryTimeframe, 'Срок доставки', false)
		if (isErr(v)) return v
		data.deliveryTimeframe = v
	}

	for (const [key, label] of [
		['acceptanceDate', 'дата приёма'],
		['shipmentDate', 'дата отправки'],
	] as const) {
		if (!has(key)) continue
		const v = date(body[key], label)
		if (isErr(v)) return v
		data[key] = v as Date | null
	}

	if (has('deliveryAmount')) {
		if (isEmpty(body.deliveryAmount)) data.deliveryAmount = null
		else {
			const raw = body.deliveryAmount
			const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN
			if (!Number.isFinite(n) || n < 0 || n > 1e12) return { error: 'Некорректная сумма доставки' }
			data.deliveryAmount = n
		}
	}

	return { data }
}

/** Трек-номер из body.id для создания: строка, в верхнем регистре, без пробелов по краям. */
export function parseTrackingId(v: unknown): string | { error: string } {
	if (typeof v !== 'string') return { error: 'Некорректный трек-номер' }
	const s = v.toUpperCase().trim()
	if (!s) return { error: 'Некорректный трек-номер' }
	if (s.length > MAX_TRACKING_ID || s.includes('\u0000')) return { error: 'Некорректный трек-номер' }
	return s
}
