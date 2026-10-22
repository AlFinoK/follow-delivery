import { describe, expect, it } from 'vitest'
import { parseCargoNumbers } from '@/lib/data/parseNumbers'

describe('parseCargoNumbers', () => {
	it('разбирает числа через пробелы, запятые и точки с запятой', () => {
		expect(parseCargoNumbers('3001, 3002;3003 3004')).toEqual([3001, 3002, 3003, 3004])
	})

	it('принимает префикс № и #', () => {
		expect(parseCargoNumbers('№3001 #3002 №№3003')).toEqual([3001, 3002, 3003])
	})

	it('одиноко стоящий № игнорируется (№ 3001)', () => {
		expect(parseCargoNumbers('№ 3001')).toEqual([3001])
	})

	it('убирает дубли и мусор', () => {
		expect(parseCargoNumbers('3001 3001 abc 0 -5 1.5 №3001')).toEqual([3001])
	})

	it('пустая строка — пустой список', () => {
		expect(parseCargoNumbers('  ')).toEqual([])
	})
})
