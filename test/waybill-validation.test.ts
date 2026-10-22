import { describe, it, expect } from 'vitest'
import { initialWaybill, validateWaybill, type Position, type Waybill } from '@/lib/waybill/model'
import { MAX_LEN, mapWaybill, parseStatus, waybillData, waybillErrors, waybillItems, type WaybillRow } from '@/lib/mapWaybill'

// Валидация накладной: клиентская (validateWaybill возвращает КЛЮЧИ i18n) и серверная
// (разбор тела запроса в mapWaybill.ts — последний рубеж).

const pos = (over: Partial<Position> = {}): Position => ({
	id: 'p1',
	name: 'Квадроцикл',
	quantity: 1,
	length: 220,
	width: 120,
	height: 100,
	weight: 500,
	price: 0,
	...over,
})

const filled = (over: Partial<Waybill> = {}): Waybill => {
	const base = initialWaybill()
	return {
		...base,
		sender: { ...base.sender, fullName: 'Дарын' },
		receiver: {
			...base.receiver,
			fullName: 'Янкин Станислав',
			phone: '+79614466655',
			address: 'г. Краснодар, ул. Озерная, 15',
			city: 'Краснодар',
		},
		nature: 'Мототехника',
		positions: [pos()],
		acceptanceDate: '2026-09-01',
		...over,
	}
}

const keys = (w: Waybill) => validateWaybill(w).map((e) => e.key)

describe('клиентская валидация: новые правила', () => {
	it('эталонная накладная проходит', () => {
		expect(validateWaybill(filled())).toEqual([])
	})

	it('страна отправителя и получателя обязательна', () => {
		const w = filled()
		expect(keys({ ...w, sender: { ...w.sender, country: ' ' } })).toEqual(['wvSenderCountry'])
		expect(keys({ ...w, receiver: { ...w.receiver, country: '' } })).toEqual(['wvReceiverCountry'])
	})

	it('дата приёма обязательна и относится к третьему шагу', () => {
		const errs = validateWaybill(filled({ acceptanceDate: '' }))
		expect(errs).toEqual([{ step: 2, key: 'wvAcceptanceDate' }])
	})

	it('пустой список позиций не проходит', () => {
		const errs = validateWaybill(filled({ positions: [] }))
		expect(errs).toEqual([{ step: 1, key: 'wvPositions' }])
	})

	it('позиция из одних нулей не проходит', () => {
		const zero = pos({ length: 0, width: 0, height: 0, weight: 0 })
		expect(keys(filled({ positions: [zero] }))).toEqual(['wvPositions'])
	})

	it('достаточно веса ИЛИ полных габаритов ИЛИ ручного объёма', () => {
		expect(keys(filled({ positions: [pos({ length: 0, width: 0, height: 0 })] }))).toEqual([])
		expect(keys(filled({ positions: [pos({ weight: 0 })] }))).toEqual([])
		const zero = pos({ length: 0, width: 0, height: 0, weight: 0 })
		expect(keys(filled({ positions: [zero], manualVolume: true, volume: 2 }))).toEqual([])
		// ручной объём 0 — всё равно пусто
		expect(keys(filled({ positions: [zero], manualVolume: true, volume: 0 }))).toEqual(['wvPositions'])
	})

	it('частичные габариты (без высоты) и нулевой вес не считаются грузом', () => {
		const partial = pos({ weight: 0, height: 0 })
		expect(keys(filled({ positions: [partial] }))).toEqual(['wvPositions'])
	})

	it('сумма 0 допустима, отрицательная — нет', () => {
		expect(keys(filled({ amount: 0 }))).toEqual([])
		expect(validateWaybill(filled({ amount: -1 }))).toEqual([{ step: 1, key: 'wvAmountNegative' }])
	})

	it('отрицательные значения позиции отклоняются', () => {
		expect(keys(filled({ positions: [pos({ price: -5 })] }))).toEqual(['wvPositionNegative'])
		expect(keys(filled({ positions: [pos({ weight: -1, length: 0 })] }))).toContain('wvPositionNegative')
	})
})

describe('серверный разбор: числа', () => {
	const body = (over: Record<string, unknown> = {}) => ({ sender: {}, receiver: {}, ...over })

	it('отрицательные и бесконечные числа обнуляются, огромные — режутся', () => {
		const d = waybillData(body({ amount: -100, volume: 'abc' }))
		expect(d.amount).toBe(0)
		expect(d.volume).toBe(0)
		expect(waybillData(body({ amount: 1e308 })).amount).toBeLessThanOrEqual(1e12)
		expect(waybillData(body({ amount: Infinity })).amount).toBe(0)
	})

	it('количество — целое от 1: 1.5 → 2, 0 → 1, 0.1+0.2 → 1', () => {
		const q = (quantity: unknown) => waybillItems({ positions: [{ name: 'x', quantity }] })[0].quantity
		expect(q(1.5)).toBe(2)
		expect(q(0)).toBe(1)
		expect(q(-3)).toBe(1)
		expect(q(0.1 + 0.2)).toBe(1)
		expect(q('7')).toBe(7)
		expect(q(undefined)).toBe(1)
		expect(q(1e308)).toBeLessThanOrEqual(1_000_000)
	})

	it('отрицательные размеры позиции не проходят в базу', () => {
		const [it0] = waybillItems({ positions: [{ name: 'x', quantity: 1, weight: -5, length: -1, width: 2, height: 3, price: -9 }] })
		expect(it0).toMatchObject({ weight: 0, length: 0, price: 0, width: 2, height: 3 })
	})

	it('нетронутая позиция-заготовка (одно количество 1) отбрасывается', () => {
		expect(waybillItems({ positions: [{ name: '', quantity: 1, length: 0, width: 0, height: 0, weight: 0, price: 0 }] })).toEqual([])
	})

	it('мусор вместо позиций не роняет разбор', () => {
		expect(waybillItems({ positions: [null, 5, 'x', { name: 'ok', weight: 1 }] })).toHaveLength(1)
		expect(waybillItems({ positions: 'не массив' })).toEqual([])
	})
})

describe('серверный разбор: строки и страны', () => {
	it('длинные строки обрезаются по лимитам', () => {
		const long = 'я'.repeat(5000)
		const d = waybillData({
			sender: { fullName: long, address: long, city: long, companyTin: long },
			receiver: { phone: long, fullName: long },
			nature: long,
			specialInstructions: long,
		})
		expect(d.senderFullName).toHaveLength(MAX_LEN.name)
		expect(d.senderAddress).toHaveLength(MAX_LEN.address)
		expect(d.senderCity).toHaveLength(MAX_LEN.short)
		expect(d.senderCompanyTin).toHaveLength(MAX_LEN.short)
		expect(d.receiverPhone).toHaveLength(MAX_LEN.phone)
		expect(d.nature).toHaveLength(MAX_LEN.name)
		expect(d.specialInstructions).toHaveLength(MAX_LEN.note)
	})

	it('страна по умолчанию — только когда поля нет', () => {
		const absent = waybillData({ sender: {}, receiver: {} })
		expect(absent.senderCountry).toBe('Казахстан')
		expect(absent.receiverCountry).toBe('Россия')
		const cleared = waybillData({ sender: { country: '' }, receiver: { country: '  ' } })
		expect(cleared.senderCountry).toBe('')
		expect(cleared.receiverCountry).toBe('')
	})

	it('явно очищенная страна даёт серверную ошибку', () => {
		const ok = { fullName: 'А', address: 'ул', city: 'Город' }
		const data = waybillData({
			sender: { ...ok, country: '' },
			receiver: { ...ok, phone: '+79614466655' },
		})
		expect(waybillErrors(data)).toBe('Укажите страну отправителя')
	})

	it('sender/receiver не объекты — не падаем', () => {
		expect(() => waybillData({ sender: 'x', receiver: [] })).not.toThrow()
		expect(waybillErrors(waybillData({ sender: 'x', receiver: [] }))).toBe('Укажите ФИО отправителя')
	})

	it('parseStatus принимает только известные статусы', () => {
		expect(parseStatus('active')).toBe('active')
		expect(parseStatus(' draft ')).toBe('draft')
		expect(parseStatus('weird')).toBeNull()
		expect(parseStatus(undefined)).toBeNull()
		expect(parseStatus(5)).toBeNull()
	})
})

describe('mapWaybill', () => {
	it('сохраняет форму DTO', () => {
		const now = new Date('2026-09-01T00:00:00Z')
		const row: WaybillRow = {
			id: 'c1',
			number: 3001,
			status: 'active',
			senderFullName: 'А',
			senderType: 'individual',
			senderCompanyName: null,
			senderCompanyTin: null,
			senderContactPerson: null,
			senderAddress: 'a',
			senderCity: 'b',
			senderCountry: 'Казахстан',
			receiverFullName: 'Б',
			receiverPhone: '+79614466655',
			receiverTin: null,
			receiverPassport: null,
			receiverAddress: 'c',
			receiverCity: 'd',
			receiverCountry: 'Россия',
			nature: 'n',
			packagingOk: false,
			specialInstructions: null,
			manualVolume: false,
			volume: 0,
			payer: 'receiver',
			payMethod: 'cash',
			amount: 0,
			acceptanceDate: now,
			shipmentDate: null,
			deliveryTimeframe: null,
			cargoId: null,
			createdAt: now,
			updatedAt: now,
			items: [],
		}
		const dto = mapWaybill(row)
		expect(dto.docId).toBe('c1')
		expect(dto.acceptanceDate).toBe('2026-09-01')
	})
})
