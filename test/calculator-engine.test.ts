import { describe, it, expect } from 'vitest'
import {
	calcShipment,
	convertPlaceUnit,
	findDirection,
	isExcluded,
	placeQuantity,
	placeWarnings,
	shouldWarnExcluded,
	sumPlaces,
	type Place,
} from '@/lib/calculator/engine'

// Курс фиксируем, чтобы цены не зависели от RUB_TO_KZT в конфиге.
const RATE = 5.8

const price = (code: string, places: Place[], unit: 'm' | 'cm') => {
	const direction = findDirection(code) ?? null
	return calcShipment({ direction, totals: sumPlaces(places, unit), rate: RATE })
}

const place = (over: Partial<Place> = {}): Place => ({ length: 205, width: 100, height: 90, weight: 300, quantity: 1, ...over })

describe('цены корректного ввода не изменились (эталон снят с движка до правок)', () => {
	it('12 квадроциклов 220x120x100, 500 кг → Абакан', () => {
		const r = price('abakan', [place({ length: 2.2, width: 1.2, height: 1, weight: 500, quantity: 12 })], 'm')
		expect(r.totals).toEqual({ totalVolume: 31.68, totalWeight: 6000, totalPlaces: 12 })
		expect(r.price).toBe(2_643_470)
		expect(r.billedBy).toBe('volume')
	})
	it('два вида мест → Абакан', () => {
		const r = price(
			'abakan',
			[place({ quantity: 5 }), place({ length: 190, width: 90, height: 90, weight: 260, quantity: 40 })],
			'cm'
		)
		expect(r.totals).toEqual({ totalVolume: 70.785, totalWeight: 11900, totalPlaces: 45 })
		expect(r.price).toBe(5_839_210)
	})
	it('малый груз → минимальный тариф 90 000 (Москва)', () => {
		const r = price('moskva-butovo', [place({ length: 130, width: 35, height: 60, weight: 35 })], 'cm')
		expect(r.price).toBe(90_000)
		expect(r.minApplied).toBe(true)
		expect(r.basePrice).toBe(23_680)
	})
	it('надбавка области → Архангельск +35%', () => {
		const r = price('arkhangelsk', [place({ length: 1.8, width: 0.45, height: 0.8, weight: 160, quantity: 3 })], 'm')
		expect(r.price).toBe(209_470)
		expect(r.basePrice).toBe(155_160)
		expect(r.surchargePct).toBe(35)
	})
})

describe('количество мест: пустое поле = 1', () => {
	it('placeQuantity: пусто/0/NaN → 1, корректное — как есть', () => {
		expect(placeQuantity({ quantity: 0 })).toBe(1)
		expect(placeQuantity({})).toBe(1)
		expect(placeQuantity({ quantity: NaN })).toBe(1)
		expect(placeQuantity({ quantity: -3 })).toBe(1)
		expect(placeQuantity({ quantity: 1 })).toBe(1)
		expect(placeQuantity({ quantity: 12 })).toBe(12)
	})
	it('место с очищенным «Кол-во» считается как с quantity = 1', () => {
		const other = place({ length: 190, width: 90, height: 90, weight: 260, quantity: 40 })
		const withOne = price('abakan', [place({ quantity: 1 }), other], 'cm')
		const withEmpty = price('abakan', [place({ quantity: 0 }), other], 'cm')
		expect(withEmpty.price).toBe(withOne.price)
		expect(withEmpty.totals).toEqual(withOne.totals)
		expect(withEmpty.totals?.totalPlaces).toBe(41)
	})
	it('одно место с quantity 0 даёт тот же результат, что и с 1 (а не ok:false)', () => {
		const r = price('abakan', [place({ quantity: 0 })], 'cm')
		expect(r.ok).toBe(true)
		expect(r.price).toBe(price('abakan', [place({ quantity: 1 })], 'cm').price)
	})
})

describe('переключение единиц м ↔ см', () => {
	it('м → см и обратно сохраняет размеры', () => {
		const p = place({ length: 2.2, width: 1.2, height: 1, weight: 500, quantity: 3 })
		const cm = convertPlaceUnit(p, 'm', 'cm')
		expect([cm.length, cm.width, cm.height]).toEqual([220, 120, 100])
		expect(cm.weight).toBe(500)
		expect(cm.quantity).toBe(3)
		const back = convertPlaceUnit(cm, 'cm', 'm')
		expect([back.length, back.width, back.height]).toEqual([2.2, 1.2, 1])
	})
	it('без плавающих хвостов (1.1 м, 0.07 м)', () => {
		const cm = convertPlaceUnit(place({ length: 1.1, width: 0.07, height: 0.29 }), 'm', 'cm')
		expect([cm.length, cm.width, cm.height]).toEqual([110, 7, 29])
	})
	it('см → м округляется до миллиметра', () => {
		const m = convertPlaceUnit(place({ length: 123.4, width: 0.5, height: 1 }), 'cm', 'm')
		expect([m.length, m.width, m.height]).toEqual([1.234, 0.005, 0.01])
	})
	it('та же единица и нули ничего не ломают; сохраняются name/id', () => {
		const p = place({ length: 0, name: 'Квадроцикл', id: 'x' })
		expect(convertPlaceUnit(p, 'm', 'm')).toBe(p)
		const c = convertPlaceUnit(p, 'cm', 'm')
		expect(c.length).toBe(0)
		expect(c.name).toBe('Квадроцикл')
		expect(c.id).toBe('x')
	})
	it('объём не меняется при переключении единиц', () => {
		const p = place({ length: 2.2, width: 1.2, height: 1, quantity: 2 })
		const before = sumPlaces([p], 'm').totalVolume
		const after = sumPlaces([convertPlaceUnit(p, 'm', 'cm')], 'cm').totalVolume
		expect(after).toBe(before)
	})
})

describe('мягкие предупреждения о габаритах и весе', () => {
	it('см, введённые как метры (205 м) → oversize', () => {
		expect(placeWarnings([place({ length: 205, width: 1, height: 1, weight: 5 })], 'm').oversize).toBe(true)
	})
	it('нормальные габариты — без предупреждения; граница 20 м не срабатывает', () => {
		expect(placeWarnings([place({ length: 2.2, width: 1.2, height: 1, weight: 500 })], 'm')).toEqual({ oversize: false, noWeight: false })
		expect(placeWarnings([place({ length: 20, width: 1, height: 1, weight: 1 })], 'm').oversize).toBe(false)
		expect(placeWarnings([place({ length: 2100, width: 100, height: 100, weight: 1 })], 'cm').oversize).toBe(true)
		expect(placeWarnings([place({ length: 205, width: 100, height: 90, weight: 300 })], 'cm').oversize).toBe(false)
	})
	it('вес 0 при ненулевом объёме → noWeight; пустое место — нет', () => {
		expect(placeWarnings([place({ weight: 0 })], 'cm').noWeight).toBe(true)
		expect(placeWarnings([place({ length: 0, width: 0, height: 0, weight: 0 })], 'cm').noWeight).toBe(false)
		expect(placeWarnings([place({ length: 0, weight: 0 })], 'cm').noWeight).toBe(false)
	})
})

describe('блок-лист направлений', () => {
	it('isExcluded по подстроке (как раньше)', () => {
		expect(isExcluded('Калининград')).toBe(true)
		expect(isExcluded('Снежногорск')).toBe(true)
		expect(isExcluded('Москва')).toBe(false)
	})
	it('предупреждение не показывается, если есть выбираемые города/НП', () => {
		// настоящие НП РФ, которые цепляет подстрочный блок-лист
		for (const q of ['Снежногорск', 'Донецк', 'Шахтёрск']) {
			expect(shouldWarnExcluded(q, true)).toBe(false)
		}
	})
	it('предупреждение остаётся, когда выбрать нечего', () => {
		expect(shouldWarnExcluded('Калининград', false)).toBe(true)
		expect(shouldWarnExcluded('Мариуполь', false)).toBe(true)
		expect(shouldWarnExcluded('Саратов', false)).toBe(false)
	})
})
