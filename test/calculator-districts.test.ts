import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { resolveDistrict, resolveSurcharge } from '@/lib/calculator/districts'

// Региональная надбавка (improves2.0): ставка берётся по ОБЛАСТИ НП, а не по
// названию одноимённого города-тёзки (баг: «Курган» в Саратовской области получал 0).

const root = resolve(__dirname, '..')

// items: [name, regionIdx, districtIdx, codeIdx, population]
const settlements = JSON.parse(readFileSync(resolve(root, 'lib/calculator/settlements.json'), 'utf8')) as {
	regions: string[]
	items: [string, number, number, number, number][]
}

// Эталон по терминалам: код → доля надбавки, снят ДО правки resolveSurcharge.
const terminalExpected = JSON.parse(
	readFileSync(resolve(root, 'test/fixtures/calculator-terminal-surcharges.json'), 'utf8')
) as Record<string, number>
const terminals = JSON.parse(readFileSync(resolve(root, 'lib/calculator/directions.json'), 'utf8')) as {
	code: string
	name: string
	region: string
}[]

describe('resolveSurcharge: одноимённые НП в чужой области', () => {
	it('Курган / Саратовская область → базовая 20% Приволжского округа', () => {
		expect(resolveSurcharge('Курган', 'Саратовская область')).toBe(0.2)
	})
	it('Москва / Кировская область → 20%', () => {
		expect(resolveSurcharge('Москва', 'Кировская область')).toBe(0.2)
	})
	it('Орёл / Воронежская область → 20%', () => {
		expect(resolveSurcharge('Орёл', 'Воронежская область')).toBe(0.2)
	})
	it('Тула / Ульяновская область → 20%', () => {
		expect(resolveSurcharge('Тула', 'Ульяновская область')).toBe(0.2)
	})
	it('Севастополь / Оренбургская область → 20%, а не 30% Крыма', () => {
		expect(resolveSurcharge('Севастополь', 'Оренбургская область')).toBe(0.2)
	})
	it('настоящие исключения по области сохраняются', () => {
		expect(resolveSurcharge('Курган', 'Курганская область')).toBe(0)
		expect(resolveSurcharge('Москва', 'Московская область')).toBe(0)
		expect(resolveSurcharge('Севастополь', 'Республика Крым')).toBe(0.3)
		expect(resolveSurcharge('Архангельск', 'Архангельская область')).toBe(0.35)
	})
	it('фолбэк по названию работает, когда область не определяет округ', () => {
		expect(resolveDistrict('', 'Россия')).toBeNull()
		expect(resolveSurcharge('Москва', 'Россия')).toBe(0)
		expect(resolveSurcharge('Севастополь', '')).toBe(0.3)
		expect(resolveSurcharge('Архангельск', 'Россия')).toBe(0.35)
		expect(resolveSurcharge('Саратов', 'Россия')).toBe(0.2)
	})
	it('служебные имена объектов не принимаются за ключи', () => {
		expect(resolveSurcharge('constructor', 'toString')).toBe(0)
		expect(resolveDistrict('constructor', 'constructor')).toBeNull()
	})
})

describe('resolveSurcharge: полный прогон справочника НП', () => {
	it('ставка НП = ставке его области (если область даёт округ) для всех НП', () => {
		const bad: string[] = []
		let checked = 0
		for (const [name, ri] of settlements.items) {
			const region = settlements.regions[ri]
			if (resolveDistrict('', region) === null) continue
			checked++
			if (resolveSurcharge(name, region) !== resolveSurcharge('', region)) bad.push(`${name} / ${region}`)
		}
		expect(settlements.items.length).toBeGreaterThan(100_000)
		expect(checked).toBeGreaterThan(100_000)
		expect(bad.slice(0, 10)).toEqual([])
	})
})

describe('resolveSurcharge: города-терминалы', () => {
	it('справочник терминалов не изменился (169)', () => {
		expect(terminals.length).toBe(169)
		expect(Object.keys(terminalExpected).length).toBe(169)
	})
	it('надбавка каждого терминала совпадает с эталоном до правки', () => {
		const diffs = terminals
			.filter((d) => resolveSurcharge(d.name, d.region) !== terminalExpected[d.code])
			.map((d) => `${d.code}: ${resolveSurcharge(d.name, d.region)} != ${terminalExpected[d.code]}`)
		expect(diffs).toEqual([])
	})
})
