import { describe, it, expect } from 'vitest'
import {
	autoVolume,
	buildLogistSummary,
	effectiveVolume,
	fmtDecimal,
	fmtMoney,
	initialWaybill,
	totalGoodsPrice,
	totalWeight,
	validateWaybill,
	type Position,
	type Waybill,
} from '@/lib/waybill/model'

// Чистая логика накладной: итоги, форматы и сводка логистам.
// Эталон — заявка заказчика №2782 (12 квадроциклов 220x120x100, 500 кг, 500.000 ₸/ед.):
// общий вес 6000 кг, объём 31,680 м³, стоимость доставки 2 363 000 ₸.

const pos = (over: Partial<Position> = {}): Position => ({
	id: 'p1',
	name: 'Квадроцикл 700 куб',
	quantity: 12,
	length: 220,
	width: 120,
	height: 100,
	weight: 500,
	price: 500000,
	...over,
})

const filled = (over: Partial<Waybill> = {}): Waybill => ({
	...initialWaybill(),
	sender: { ...initialWaybill().sender, fullName: 'Дарын' },
	receiver: {
		fullName: 'Янкин Станислав Владимирович',
		phone: '+79614466655',
		tin: '070302810302',
		passport: '07 11 604285',
		address: 'г. Краснодар, ул. Озерная, 15/9а',
		city: 'Краснодар',
		country: 'Россия',
	},
	nature: 'Мототехника',
	positions: [pos()],
	amount: 2363000,
	...over,
})

describe('итоги груза', () => {
	it('вес = Σ вес места × количество', () => {
		expect(totalWeight([pos()])).toBe(6000)
	})

	it('объём считается из габаритов в см³ → м³', () => {
		expect(autoVolume([pos()])).toBeCloseTo(31.68, 3)
		expect(fmtDecimal(autoVolume([pos()]))).toBe('31,680')
	})

	it('ручной объём перебивает расчёт по габаритам', () => {
		expect(effectiveVolume(filled({ manualVolume: true, volume: 40 }))).toBe(40)
		expect(effectiveVolume(filled({ manualVolume: false, volume: 40 }))).toBeCloseTo(31.68, 3)
	})

	it('пустые позиции не ломают итоги', () => {
		expect(totalWeight([])).toBe(0)
		expect(autoVolume([pos({ length: 0, width: 0, height: 0 })])).toBe(0)
	})

	it('стоимость товара = цена × количество (ПРАВКИ 2, п.1)', () => {
		expect(totalGoodsPrice([pos()])).toBe(6000000)
	})
})

describe('форматы под образец заказчика', () => {
	it('деньги — точка как разделитель тысяч', () => {
		expect(fmtMoney(500000)).toBe('500.000')
		expect(fmtMoney(2363000)).toBe('2.363.000')
		expect(fmtMoney(0)).toBe('0')
	})

	it('дробные — запятая', () => {
		expect(fmtDecimal(1.9112, 3)).toBe('1,911')
		expect(fmtDecimal(6000, 1)).toBe('6000,0')
	})
})

describe('валидация перед сохранением', () => {
	it('заполненная накладная проходит', () => {
		expect(validateWaybill(filled())).toEqual([])
	})

	it('пустая накладная даёт ошибки на первом шаге', () => {
		const errs = validateWaybill(initialWaybill())
		expect(errs.length).toBeGreaterThan(0)
		expect(errs[0].step).toBe(0)
	})

	it('битый телефон не проходит', () => {
		const errs = validateWaybill(filled({ receiver: { ...filled().receiver, phone: '+7961' } }))
		expect(errs.some((e) => e.key === 'wvPhone')).toBe(true)
	})

	it('характер груза обязателен и относится ко второму шагу', () => {
		const errs = validateWaybill(filled({ nature: '' }))
		expect(errs).toHaveLength(1)
		expect(errs[0].step).toBe(1)
	})

	it('компании нужно название', () => {
		const w = filled()
		const errs = validateWaybill({ ...w, sender: { ...w.sender, type: 'company', companyName: '' } })
		expect(errs.some((e) => e.key === 'wvCompanyName')).toBe(true)
	})
})

describe('сводка логистам (формат заявки №2782)', () => {
	const summary = buildLogistSummary(filled({ number: 2782 }))

	it('номер, участники и адрес', () => {
		expect(summary).toContain('№2782')
		expect(summary).toContain('Дарын')
		expect(summary).toContain('Янкин Станислав Владимирович')
		expect(summary).toContain('г. Краснодар, ул. Озерная, 15/9а')
	})

	it('позиция: наименование, габариты, вес и стоимость товара', () => {
		expect(summary).toContain('Квадроцикл 700 куб - 12шт')
		expect(summary).toContain('220x120x100 - 500кг')
		expect(summary).toContain('Стоимость - 500.000 тенге')
	})

	it('итоги и стоимость доставки', () => {
		expect(summary).toContain('31,680 м³')
		expect(summary).toContain('6000,0 кг')
		expect(summary).toContain('2.363.000 тенге')
	})

	it('пустые ИНН/паспорт не печатаются', () => {
		const w = filled()
		const s = buildLogistSummary({ ...w, receiver: { ...w.receiver, tin: '', passport: '' } })
		expect(s).not.toContain('ИНН')
		expect(s).not.toContain('Паспорт')
	})
})
