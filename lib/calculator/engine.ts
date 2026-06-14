// ─────────────────────────────────────────────────────────────────────────────
// Движок расчёта (чистые функции). Логика повторяет модель ПЭК — см. config.ts.
// ─────────────────────────────────────────────────────────────────────────────

import {
	DENSITY_KG_PER_M3,
	DIRECTIONS,
	EXCLUDED_PATTERNS,
	FALLBACK_DIRECTION,
	FALLBACK_ENABLED,
	type Direction,
	type TariffCurve,
} from './config'

export type LengthUnit = 'm' | 'cm'

/** Одно грузовое место (режим «по габаритам»). */
export interface Place {
	length: number // в выбранных единицах (м или см)
	width: number
	height: number
	weight: number // вес одного места, кг
	quantity: number // количество одинаковых мест
}

export interface CargoTotals {
	totalVolume: number // м³
	totalWeight: number // кг
	totalPlaces: number // шт
}

export interface CalcResult {
	ok: boolean
	excluded?: boolean
	approximate?: boolean // цена приблизительная (город вне справочника)
	cityName?: string
	price?: number // ₽, склад-склад
	days?: number // календарных дней
	paidWeight?: number // расчётный (платный) вес, кг
	billedBy?: 'weight' | 'volume' // что определило цену
	totals?: CargoTotals
}

const toMeters = (value: number, unit: LengthUnit): number => (unit === 'cm' ? value / 100 : value)

/** Объём одного места (м³) из габаритов в выбранных единицах. */
export function placeVolume(p: Place, unit: LengthUnit): number {
	const l = toMeters(p.length || 0, unit)
	const w = toMeters(p.width || 0, unit)
	const h = toMeters(p.height || 0, unit)
	return l * w * h
}

/** Суммарные объём/вес/места по списку мест (режим «по габаритам»). */
export function sumPlaces(places: Place[], unit: LengthUnit): CargoTotals {
	let totalVolume = 0
	let totalWeight = 0
	let totalPlaces = 0
	for (const p of places) {
		const qty = Math.max(0, p.quantity || 0)
		totalVolume += placeVolume(p, unit) * qty
		totalWeight += (p.weight || 0) * qty
		totalPlaces += qty
	}
	return {
		totalVolume: round(totalVolume, 4),
		totalWeight: round(totalWeight, 2),
		totalPlaces,
	}
}

/** Платный вес = max(фактический вес, объёмный вес). Объёмный вес = объём × плотность. */
export function paidWeight(totalWeight: number, totalVolume: number): { value: number; billedBy: 'weight' | 'volume' } {
	const volumetric = totalVolume * DENSITY_KG_PER_M3
	if (volumetric > totalWeight) return { value: volumetric, billedBy: 'volume' }
	return { value: totalWeight, billedBy: 'weight' }
}

/**
 * Цена по кривой направления для заданного платного веса.
 * - ниже первой точки → минимальный тариф (цена первой точки);
 * - между точками → линейная интерполяция;
 * - выше последней точки → продление по ставке последнего участка (₽/кг на «оптовом» хвосте).
 */
export function priceFromCurve(curve: TariffCurve, pw: number): number {
	const points = Object.keys(curve)
		.map((k) => [Number(k), curve[k]] as [number, number])
		.filter(([w, p]) => Number.isFinite(w) && Number.isFinite(p))
		.sort((a, b) => a[0] - b[0])

	if (points.length === 0) return 0
	if (pw <= points[0][0]) return points[0][1]

	const last = points[points.length - 1]
	if (pw >= last[0]) {
		const ratePerKg = last[1] / last[0] // на хвосте кривая линейна и проходит ~через 0
		return ratePerKg * pw
	}

	for (let i = 1; i < points.length; i++) {
		const [w0, p0] = points[i - 1]
		const [w1, p1] = points[i]
		if (pw <= w1) {
			const t = (pw - w0) / (w1 - w0)
			return p0 + t * (p1 - p0)
		}
	}
	return last[1]
}

const normalize = (s: string) => s.trim().toLowerCase().replace(/ё/g, 'е')

/** Проверка, что направление исключено (наш блок-лист). */
export function isExcluded(cityName: string): boolean {
	const n = normalize(cityName)
	if (!n) return false
	return EXCLUDED_PATTERNS.some((pat) => n.includes(normalize(pat)))
}

/** Поиск направления по коду. */
export function findDirection(code: string): Direction | undefined {
	return DIRECTIONS.find((d) => d.code === code)
}

/**
 * Главный расчёт. `direction` — выбранное направление (из справочника) либо null,
 * тогда (если задано имя города) используется приблизительная оценка.
 */
export function calcShipment(params: {
	direction: Direction | null
	cityName: string
	totals: CargoTotals
}): CalcResult {
	const { direction, cityName, totals } = params

	if (cityName && isExcluded(cityName)) {
		return { ok: false, excluded: true, cityName }
	}

	let dir = direction
	let approximate = false
	if (!dir) {
		if (!FALLBACK_ENABLED || !cityName.trim()) return { ok: false }
		dir = { ...FALLBACK_DIRECTION, name: cityName }
		approximate = true
	}

	if (totals.totalWeight <= 0 && totals.totalVolume <= 0) return { ok: false }

	const pw = paidWeight(totals.totalWeight, totals.totalVolume)
	const price = Math.round(priceFromCurve(dir.curve, pw.value))

	return {
		ok: true,
		approximate,
		cityName: dir.name || cityName,
		price,
		days: dir.days,
		paidWeight: round(pw.value, 1),
		billedBy: pw.billedBy,
		totals,
	}
}

function round(n: number, digits: number): number {
	const f = Math.pow(10, digits)
	return Math.round(n * f) / f
}
