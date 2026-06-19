// ─────────────────────────────────────────────────────────────────────────────
// Движок расчёта (чистые функции). Повторяет модель ПЭК:
//   стоимость = max( тариф_по_весу(вес) , тариф_по_объёму(объём) )
// Кривые тарифов сняты с боевого расчётчика ПЭК — см. config.ts / PEC_ANALYSIS.md
// ─────────────────────────────────────────────────────────────────────────────

import {
	DIRECTIONS,
	EXCLUDED_PATTERNS,
	MIN_PRICE_KZT,
	RUB_TO_KZT,
	V_GRID,
	W_LIN_GRID,
	W_STEP_GRID,
	type Direction,
	type VolumeCurve,
	type WeightCurve,
} from './config'
import { type FederalDistrict } from './districts'

export type LengthUnit = 'm' | 'cm'

/** Одно грузовое место (режим «по габаритам»). */
export interface Place {
	id?: string // стабильный ключ для React-списка (движок его игнорирует)
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
	cityName?: string
	region?: string
	price?: number // ₸, склад-склад (итог: с надбавкой округа и мин. тарифом)
	priceRub?: number // ₽ до конвертации (для отладки/подписи; нет в режиме пресетов)
	basePrice?: number // ₸ до региональной надбавки
	days?: string // срок доставки, напр. «9–14»
	billedBy?: 'weight' | 'volume' // что определило цену
	totals?: CargoTotals
	district?: FederalDistrict | null // округ назначения (для подписи)
	surchargeApplied?: boolean // применена ли региональная надбавка
	surchargePct?: number // размер надбавки в % (для подписи)
	minApplied?: boolean // цена подтянута до минимального тарифа
}

/**
 * Финализация цены (₸): региональная надбавка (доля, improves2.0 — зависит от
 * области) и минимальный тариф. Округление до 10 ₸. Возвращает итог и флаги.
 */
function finalizePrice(
	baseKzt: number,
	surcharge: number
): { price: number; basePrice: number; surchargeApplied: boolean; minApplied: boolean } {
	const basePrice = Math.round(baseKzt / 10) * 10
	const surchargeApplied = surcharge > 0
	// надбавку считаем от округлённой базы; итог независимо округляется до 10 ₸
	let price = surchargeApplied ? basePrice * (1 + surcharge) : basePrice
	price = Math.round(price / 10) * 10
	const minApplied = price < MIN_PRICE_KZT
	if (minApplied) price = MIN_PRICE_KZT
	return { price, basePrice, surchargeApplied, minApplied }
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

/**
 * Тариф по весу (₽). Воспроизводит структуру ПЭК:
 * - ≤ 35 кг — ступенчатые минимальные тарифы: цена = значение в наименьшем
 *   узле сетки [1,3,5,15,35], который ≥ веса (внутри бакета цена постоянна);
 * - > 35 кг — кусочно-линейная интерполяция по узлам [35,50,…,20000];
 * - > 20000 кг — продление по ставке последнего участка.
 */
export function priceByWeight(curve: WeightCurve, weight: number): number {
	if (weight <= 0) return 0
	if (weight <= W_STEP_GRID[W_STEP_GRID.length - 1]) {
		for (const p of W_STEP_GRID) if (weight <= p) return curve[String(p)]
		return curve[String(W_STEP_GRID[W_STEP_GRID.length - 1])]
	}
	const last = W_LIN_GRID[W_LIN_GRID.length - 1]
	if (weight >= last) {
		const prev = W_LIN_GRID[W_LIN_GRID.length - 2]
		const rate = (curve[String(last)] - curve[String(prev)]) / (last - prev)
		return curve[String(last)] + rate * (weight - last)
	}
	for (let i = 1; i < W_LIN_GRID.length; i++) {
		const w0 = W_LIN_GRID[i - 1]
		const w1 = W_LIN_GRID[i]
		if (weight <= w1) {
			const t = (weight - w0) / (w1 - w0)
			return curve[String(w0)] + t * (curve[String(w1)] - curve[String(w0)])
		}
	}
	return curve[String(last)]
}

/**
 * Тариф по объёму (₽). Кусочно-линейная интерполяция по узлам [0.1,…,20]:
 * - < 0.1 м³ — линейно через ноль к первому узлу (малый объём → малая цена,
 *   так что в max() побеждает вес — как и у ПЭК);
 * - > 20 м³ — продление по ставке последнего участка.
 */
export function priceByVolume(curve: VolumeCurve, volume: number): number {
	if (volume <= 0) return 0
	const first = V_GRID[0]
	if (volume <= first) return curve[String(first)] * (volume / first)
	const last = V_GRID[V_GRID.length - 1]
	if (volume >= last) {
		const prev = V_GRID[V_GRID.length - 2]
		const rate = (curve[String(last)] - curve[String(prev)]) / (last - prev)
		return curve[String(last)] + rate * (volume - last)
	}
	for (let i = 1; i < V_GRID.length; i++) {
		const v0 = V_GRID[i - 1]
		const v1 = V_GRID[i]
		if (volume <= v1) {
			const t = (volume - v0) / (v1 - v0)
			return curve[String(v0)] + t * (curve[String(v1)] - curve[String(v0)])
		}
	}
	return curve[String(last)]
}

const normalize = (s: string) => s.trim().toLowerCase().replace(/ё/g, 'е')

/** Проверка, что направление исключено (наш блок-лист). */
export function isExcluded(cityName: string): boolean {
	const n = normalize(cityName)
	if (!n) return false
	return EXCLUDED_PATTERNS.some((pat) => n.includes(normalize(pat)))
}

/** Поиск направления по коду терминала. */
export function findDirection(code: string): Direction | undefined {
	return DIRECTIONS.find((d) => d.code === code)
}

const formatDays = ([min, max]: [number, number]): string => (min === max ? `${min}` : `${min}–${max}`)

/**
 * Главный расчёт. `direction` — выбранный город из справочника.
 * Цена = max(по весу, по объёму) в ₽ → конвертация в ₸ → округление до 10 ₸.
 */
export function calcShipment(params: {
	direction: Direction | null
	totals: CargoTotals
	/** курс ₽→₸; если не передан — используется запасной из конфига */
	rate?: number
}): CalcResult {
	const { direction, totals } = params
	const rate = params.rate && params.rate > 0 ? params.rate : RUB_TO_KZT

	if (!direction) return { ok: false }
	if (totals.totalWeight <= 0 && totals.totalVolume <= 0) return { ok: false }

	const byWeight = priceByWeight(direction.w, totals.totalWeight)
	const byVolume = priceByVolume(direction.v, totals.totalVolume)
	const billedBy: 'weight' | 'volume' = byVolume > byWeight ? 'volume' : 'weight'
	const priceRub = Math.max(byWeight, byVolume)
	const { price, basePrice, surchargeApplied, minApplied } = finalizePrice(priceRub * rate, direction.surcharge)

	return {
		ok: true,
		cityName: direction.name,
		region: direction.region,
		price,
		basePrice,
		priceRub: Math.round(priceRub),
		days: formatDays(direction.days),
		billedBy,
		totals,
		district: direction.district,
		surchargeApplied,
		surchargePct: Math.round((direction.surcharge || 0) * 100),
		minApplied,
	}
}

function round(n: number, digits: number): number {
	const f = Math.pow(10, digits)
	return Math.round(n * f) / f
}
