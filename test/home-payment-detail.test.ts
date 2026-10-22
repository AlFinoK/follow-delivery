import { describe, expect, it } from 'vitest'
import { formatPaymentDetail } from '@/lib/format'

// «Детали оплаты» на публичной карточке груза (CargoResultCard): валюту дописываем только к числу.
const NBSP = ' '

describe('formatPaymentDetail', () => {
	it('к одному числу дописывает символ валюты груза', () => {
		expect(formatPaymentDetail('50000', 'KZT')).toBe(`50${NBSP}000${NBSP}₸`)
		expect(formatPaymentDetail('50 000', 'RUB')).toBe(`50${NBSP}000${NBSP}₽`)
		expect(formatPaymentDetail(' 1500 ', null)).toBe(`1${NBSP}500${NBSP}₸`)
	})

	it('текст, где валюта уже есть, не трогает (не «₸ ₸»)', () => {
		expect(formatPaymentDetail('Оплачено 50 000 ₸', 'KZT')).toBe('Оплачено 50 000 ₸')
		expect(formatPaymentDetail('50 000 тг', 'KZT')).toBe('50 000 тг')
		expect(formatPaymentDetail('20000 руб', 'RUB')).toBe('20000 руб')
		expect(formatPaymentDetail('30000 KZT', 'KZT')).toBe('30000 KZT')
	})

	it('произвольный текст без чисел показывает как есть', () => {
		expect(formatPaymentDetail('остаток при получении', 'KZT')).toBe('остаток при получении')
		expect(formatPaymentDetail('50% предоплата', 'KZT')).toBe('50% предоплата')
	})

	it('пустое значение — пустая строка (строка деталей не выводится)', () => {
		expect(formatPaymentDetail('', 'KZT')).toBe('')
		expect(formatPaymentDetail('   ', 'KZT')).toBe('')
		expect(formatPaymentDetail(null, 'KZT')).toBe('')
		expect(formatPaymentDetail(undefined)).toBe('')
	})
})
