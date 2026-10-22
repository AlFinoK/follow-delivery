import { describe, expect, it } from 'vitest'
import { interpolate, parsePageParam, safeLocalPath, formatNumber } from '@/lib/format'

describe('interpolate (подстановка в tf)', () => {
	it('подставляет значения', () => {
		expect(interpolate('Найдено {found} из {total}', { found: 3, total: 10 })).toBe('Найдено 3 из 10')
	})

	it('не трактует $-последовательности в значении как спецшаблоны replace', () => {
		expect(interpolate('ID: {id}', { id: 'a$&b' })).toBe('ID: a$&b')
		expect(interpolate('ID: {id}', { id: "a$'b" })).toBe("ID: a$'b")
		expect(interpolate('ID: {id}', { id: 'a$`b' })).toBe('ID: a$`b')
		expect(interpolate('ID: {id}', { id: '$1$$' })).toBe('ID: $1$$')
	})

	it('заменяет все повторы плейсхолдера', () => {
		expect(interpolate('{n} + {n} = 2×{n}', { n: 5 })).toBe('5 + 5 = 2×5')
	})

	it('неизвестные плейсхолдеры остаются как есть', () => {
		expect(interpolate('{a} и {b}', { a: 1 })).toBe('1 и {b}')
		expect(interpolate('нет параметров {x}', {})).toBe('нет параметров {x}')
	})

	it('значение с «{другой_ключ}» не подставляется повторно', () => {
		expect(interpolate('{a} {b}', { a: '{b}', b: 'X' })).toBe('{b} X')
	})

	it('ключи прототипа не подставляются', () => {
		expect(interpolate('{toString}', {})).toBe('{toString}')
	})
})

describe('parsePageParam', () => {
	it('нормальные значения', () => {
		expect(parsePageParam('3')).toBe(3)
		expect(parsePageParam(' 12 ')).toBe(12)
	})
	it('мусор → 1', () => {
		for (const v of ['garbage', '', '0', '-2', '2.5', '1e3', 'NaN', 'Infinity', '99999999', null, undefined]) {
			expect(parsePageParam(v as string | null | undefined)).toBe(1)
		}
	})
})

describe('safeLocalPath (returnTo / callbackUrl)', () => {
	it('пропускает внутренние пути', () => {
		expect(safeLocalPath('/admin?page=2&q=abc')).toBe('/admin?page=2&q=abc')
		expect(safeLocalPath('/admin/cargo/xyz')).toBe('/admin/cargo/xyz')
	})
	it('режет внешние и обходные формы', () => {
		for (const v of [
			'https://evil.com',
			'//evil.com',
			'///evil.com',
			'/\\evil.com',
			'\\\\evil.com',
			'/\t/evil.com',
			'/\n/evil.com',
			'javascript:alert(1)',
			'admin',
			'',
			null,
			undefined,
		]) {
			expect(safeLocalPath(v as string | null | undefined)).toBe('/admin')
		}
	})
	it('уважает fallback', () => {
		expect(safeLocalPath('//x', '/login')).toBe('/login')
	})
})

describe('formatNumber', () => {
	it('разделители тысяч не зависят от локали окружения', () => {
		expect(formatNumber(1234567).replace(/\s/g, ' ')).toBe('1 234 567')
	})
})
