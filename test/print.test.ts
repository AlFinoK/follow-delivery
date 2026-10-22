import { describe, expect, it } from 'vitest'
import { buildHtml, esc, placesCount, ru, timeframe } from '@/lib/waybill/print'
import { initialWaybill, type Waybill } from '@/lib/waybill/model'

const EVIL = `<script>alert(1)</script>"'&`

describe('esc', () => {
	it('экранирует теги, амперсанд и оба вида кавычек', () => {
		expect(esc(`<a href="x" onclick='y'>&</a>`)).toBe('&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;&lt;/a&gt;')
	})

	it('не двоит экранирование «&» один раз и принимает null/числа', () => {
		expect(esc('a & b')).toBe('a &amp; b')
		expect(esc(null)).toBe('')
		expect(esc(undefined)).toBe('')
		expect(esc(3001)).toBe('3001')
	})
})

describe('timeframe', () => {
	it('нормальный срок', () => {
		expect(timeframe('10|days')).toBe('10 дн.')
		expect(timeframe('2|weeks')).toBe('2 нед.')
		expect(timeframe('3|months')).toBe('3 мес.')
	})

	it('пусто — тире', () => {
		expect(timeframe('')).toBe('—')
		expect(timeframe('|days')).toBe('—')
	})

	it('экранирует произвольные значения', () => {
		const out = timeframe(`<img src=x onerror=alert(1)>|<script>`)
		expect(out).not.toContain('<')
		expect(out).toContain('&lt;img')
	})

	it('служебные имена объекта не считаются единицами', () => {
		expect(timeframe('5|constructor')).toBe('5 constructor')
	})
})

describe('ru (дата)', () => {
	it('YYYY-MM-DD → ДД.ММ.ГГГГ', () => {
		expect(ru('2026-10-21')).toBe('21.10.2026')
		expect(ru('')).toBe('—')
	})

	it('нестандартная строка экранируется', () => {
		expect(ru(`<b>x</b>`)).toBe('&lt;b&gt;x&lt;/b&gt;')
	})
})

describe('placesCount', () => {
	it('округляет дробные количества', () => {
		expect(placesCount([1.4, 2.6])).toBe(4)
		expect(placesCount([0.2])).toBe(0)
	})

	it('отрицательные и мусор → 0', () => {
		expect(placesCount([-3, NaN, 2])).toBe(2)
	})
})

describe('buildHtml', () => {
	const evilWaybill = (): Waybill => {
		const w = initialWaybill()
		return {
			...w,
			number: 3001,
			nature: EVIL,
			specialInstructions: EVIL,
			acceptanceDate: EVIL,
			shipmentDate: EVIL,
			deliveryTimeframe: `${EVIL}|${EVIL}`,
			sender: { ...w.sender, type: 'company', fullName: EVIL, companyName: EVIL, companyTin: EVIL, contactPerson: EVIL, address: EVIL, city: EVIL, country: EVIL },
			receiver: { ...w.receiver, fullName: EVIL, phone: EVIL, tin: EVIL, passport: EVIL, address: EVIL, city: EVIL, country: EVIL },
			positions: [{ ...w.positions[0], name: EVIL, quantity: 2.6, weight: 10 }],
		}
	}

	it('ни одно пользовательское значение не попадает в документ как разметка', () => {
		const html = buildHtml(evilWaybill(), 'https://example.test')
		// единственный <script> — собственный fit()/print документа
		expect(html.match(/<script/g)?.length).toBe(1)
		expect(html).not.toContain('<script>alert(1)')
		expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
		expect(html).toContain('&quot;')
	})

	it('дробное количество мест печатается целым', () => {
		const html = buildHtml(evilWaybill(), 'https://example.test')
		expect(html).toContain('<td class="lbl">Мест</td><td>3</td>')
	})
})
