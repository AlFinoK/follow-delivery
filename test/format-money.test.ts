import { describe, expect, it } from 'vitest'
import { formatMoney, formatPaymentDetail, parseHumanAmount } from '@/lib/format'
import { showCurrentCity, getPaymentUi } from '@/components/admin/statusUi'

const NB = ' '

describe('formatMoney — единый формат денег в UI', () => {
	it('разделитель тысяч и пробел перед валютой — неразрывные пробелы', () => {
		expect(formatMoney(107500, 'KZT')).toBe(`107${NB}500${NB}₸`)
		expect(formatMoney(1234567, 'RUB')).toBe(`1${NB}234${NB}567${NB}₽`)
	})

	it('без валюты / неизвестная валюта → ₸', () => {
		expect(formatMoney(500)).toBe(`500${NB}₸`)
		expect(formatMoney(500, null)).toBe(`500${NB}₸`)
		expect(formatMoney(500, 'XYZ')).toBe(`500${NB}₸`)
	})

	it('дробная часть — запятая, не больше двух знаков', () => {
		expect(formatMoney(1250.5, 'RUB')).toBe(`1${NB}250,5${NB}₽`)
		expect(formatMoney(10.456, 'KZT')).toBe(`10,46${NB}₸`)
	})

	it('ноль — сумма, а не пустота', () => {
		expect(formatMoney(0, 'KZT')).toBe(`0${NB}₸`)
	})

	it('null / undefined / NaN / Infinity → пустая строка', () => {
		expect(formatMoney(null, 'KZT')).toBe('')
		expect(formatMoney(undefined)).toBe('')
		expect(formatMoney(NaN)).toBe('')
		expect(formatMoney(Infinity)).toBe('')
	})

	it('в результате нет обычных пробелов и U+202F — только U+00A0', () => {
		const s = formatMoney(98765432.1, 'KZT')
		expect(s).not.toMatch(/[  ]/)
	})
})

describe('parseHumanAmount', () => {
	it('числа с пробелами, точками и запятыми', () => {
		expect(parseHumanAmount('50000')).toBe(50000)
		expect(parseHumanAmount('50 000')).toBe(50000)
		expect(parseHumanAmount(`50${NB}000`)).toBe(50000)
		expect(parseHumanAmount('50000,5')).toBe(50000.5)
		expect(parseHumanAmount('1 234.56')).toBe(1234.56)
		expect(parseHumanAmount('1.500')).toBe(1500)
		expect(parseHumanAmount('50,000')).toBe(50000)
		expect(parseHumanAmount('1.234.567')).toBe(1234567)
		expect(parseHumanAmount('1.234,56')).toBe(1234.56)
		expect(parseHumanAmount('1,234.56')).toBe(1234.56)
		expect(parseHumanAmount('0.5')).toBe(0.5)
	})

	it('текст, пустота и голые разделители → null', () => {
		expect(parseHumanAmount('Оплачено 50 000')).toBeNull()
		expect(parseHumanAmount('50 000 ₸')).toBeNull()
		expect(parseHumanAmount('-500')).toBeNull()
		expect(parseHumanAmount('')).toBeNull()
		expect(parseHumanAmount('  ')).toBeNull()
		expect(parseHumanAmount('.,')).toBeNull()
		expect(parseHumanAmount(',5')).toBeNull()
		expect(parseHumanAmount(null)).toBeNull()
	})
})

describe('formatPaymentDetail — валюта только к чистому числу', () => {
	it('число → формат денег с валютой груза', () => {
		expect(formatPaymentDetail('50000', 'KZT')).toBe(`50${NB}000${NB}₸`)
		expect(formatPaymentDetail(' 50 000 ', 'RUB')).toBe(`50${NB}000${NB}₽`)
		expect(formatPaymentDetail('12500,5', 'RUB')).toBe(`12${NB}500,5${NB}₽`)
	})

	it('свободный текст — как есть, без второй валюты («Оплачено 50 000 ₸ ₸»)', () => {
		expect(formatPaymentDetail('Оплачено 50 000 ₸', 'KZT')).toBe('Оплачено 50 000 ₸')
		expect(formatPaymentDetail('50 000 ₸', 'KZT')).toBe('50 000 ₸')
		expect(formatPaymentDetail('аванс 30%', 'KZT')).toBe('аванс 30%')
		expect(formatPaymentDetail('  предоплата  ', 'KZT')).toBe('предоплата')
	})

	it('пусто → пустая строка', () => {
		expect(formatPaymentDetail('', 'KZT')).toBe('')
		expect(formatPaymentDetail('   ', 'KZT')).toBe('')
		expect(formatPaymentDetail(null, 'KZT')).toBe('')
		expect(formatPaymentDetail(undefined)).toBe('')
	})
})

describe('showCurrentCity — текущий город в строке списка', () => {
	it('совпадает с отправлением или назначением → не показываем', () => {
		expect(showCurrentCity({ fromCity: 'Алматы', currentCity: 'Алматы', toCity: 'Москва' })).toBe(false)
		expect(showCurrentCity({ fromCity: 'Алматы', currentCity: ' москва ', toCity: 'Москва' })).toBe(false)
		expect(showCurrentCity({ fromCity: 'Алматы', currentCity: '', toCity: 'Москва' })).toBe(false)
		expect(showCurrentCity({ fromCity: 'Алматы', currentCity: null, toCity: 'Москва' })).toBe(false)
	})

	it('промежуточный город → показываем', () => {
		expect(showCurrentCity({ fromCity: 'Алматы', currentCity: 'Астана', toCity: 'Москва' })).toBe(true)
	})
})

describe('getPaymentUi', () => {
	const t = (k: string) => k
	it('неизвестный и пустой статус оплаты → none', () => {
		expect(getPaymentUi(undefined, t).kind).toBe('none')
		expect(getPaymentUi('garbage', t).kind).toBe('none')
		expect(getPaymentUi('partial', t).kind).toBe('partial')
		expect(getPaymentUi('full', t).label).toBe('paymentFull')
	})
})
