import { describe, expect, it } from 'vitest'
import { buildCargoPatch, cargoToDraft, sanitizeCargoNumberInput } from '@/components/admin/cargoDraft'
import type { Cargo } from '@/components/admin/types'

const cargo: Cargo = {
	docId: 'd1',
	id: 'CARGO-1',
	cargoNumber: 3001,
	name: 'Квадроцикл',
	fromCity: 'Алматы',
	currentCity: 'Алматы',
	toCity: 'Москва',
	status: 'ожидает отправления',
	acceptanceDate: '2026-09-01T00:00:00.000Z',
	shipmentDate: null,
	deliveryTimeframe: '10|days',
	deliveryAmount: 150000,
	paymentStatus: 'none',
	partialPaymentDetail: null,
	currency: 'KZT',
}

describe('buildCargoPatch', () => {
	it('без правок — пустой патч', () => {
		const base = cargoToDraft(cargo)
		expect(buildCargoPatch(base, { ...base })).toEqual({})
	})

	it('пробелы по краям не считаются правкой', () => {
		const base = cargoToDraft(cargo)
		expect(buildCargoPatch(base, { ...base, name: '  Квадроцикл ', fromCity: 'Алматы ' })).toEqual({})
	})

	it('отправляет только изменённые поля, чужие правки (статус) не затираются', () => {
		const base = cargoToDraft(cargo)
		// параллельно статус стал «прибыл» — у черновика он остался старым и в патч не попадает
		const patch = buildCargoPatch(base, { ...base, currentCity: 'Астана', name: '' })
		expect(patch).toEqual({ currentCity: 'Астана', name: null })
		expect('status' in patch).toBe(false)
	})

	it('очистка номера → null, ввод → число', () => {
		const base = cargoToDraft(cargo)
		expect(buildCargoPatch(base, { ...base, cargoNumber: '' })).toEqual({ cargoNumber: null })
		expect(buildCargoPatch(base, { ...base, cargoNumber: '3002' })).toEqual({ cargoNumber: 3002 })
	})

	it('смена статуса оплаты тянет за собой сумму частичной оплаты', () => {
		const partial = { ...cargo, paymentStatus: 'partial', partialPaymentDetail: '5000' }
		const base = cargoToDraft(partial)
		expect(buildCargoPatch(base, { ...base, paymentStatus: 'full', partialPaymentDetail: '' })).toEqual({
			paymentStatus: 'full',
			partialPaymentDetail: null,
		})
		const base2 = cargoToDraft(cargo)
		expect(buildCargoPatch(base2, { ...base2, paymentStatus: 'partial' })).toEqual({
			paymentStatus: 'partial',
			partialPaymentDetail: null,
		})
	})

	it('даты сравниваются по YYYY-MM-DD', () => {
		const base = cargoToDraft(cargo)
		expect(base.acceptanceDate).toBe('2026-09-01')
		expect(buildCargoPatch(base, { ...base, shipmentDate: '2026-09-05' })).toEqual({ shipmentDate: '2026-09-05' })
	})
})

describe('sanitizeCargoNumberInput', () => {
	it('пропускает положительные целые', () => {
		expect(sanitizeCargoNumberInput('3', '')).toBe('3')
		expect(sanitizeCargoNumberInput('3000', '300')).toBe('3000')
		expect(sanitizeCargoNumberInput('2147483647', '214748364')).toBe('2147483647')
		expect(sanitizeCargoNumberInput('', '12')).toBe('')
	})
	it('отбрасывает недопустимое, оставляя прежнее', () => {
		for (const bad of ['1e2', '-5', '1.5', '1,5', '0', '007', 'abc', ' 5', '2147483648', '99999999999']) {
			expect(sanitizeCargoNumberInput(bad, 'PREV')).toBe('PREV')
		}
	})
})
