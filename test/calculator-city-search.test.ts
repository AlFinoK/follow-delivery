import { describe, expect, it } from 'vitest'
import { dedupeSettlements } from '@/components/calculator/citySearch'
import { DIRECTIONS } from '@/lib/calculator/config'

const terminals = [
	{ name: 'Киров', region: 'Киров', code: 'kirov' },
	{ name: 'Россошь', region: 'Воронежская область', code: 'rossosh-mira' },
	{ name: 'Железногорск', region: 'Курская область', code: 'zheleznogorsk' },
]

const place = (name: string, region: string, code: string) => ({ name, region, code, surcharge: 0.2 })

describe('dedupeSettlements', () => {
	it('убирает НП, который и есть город-терминал (тот же ближайший терминал)', () => {
		const out = dedupeSettlements([place('Киров', 'Кировская область', 'kirov')], terminals)
		expect(out).toEqual([])
	})

	it('убирает одноимённый НП в той же области, даже если ближайший терминал другой', () => {
		const out = dedupeSettlements([place('Россошь', 'Воронежская область', 'ostrogozhsk')], terminals)
		expect(out).toEqual([])
	})

	it('оставляет одноимённые НП в других областях — их иначе нельзя выбрать', () => {
		const kaluzhsky = place('Киров', 'Калужская область', 'bryansk')
		const krasnoyarsk = place('Железногорск', 'Красноярский край', 'krasnoyarsk')
		expect(dedupeSettlements([kaluzhsky, krasnoyarsk], terminals)).toEqual([kaluzhsky, krasnoyarsk])
	})

	it('регистр и ё не важны', () => {
		expect(dedupeSettlements([place('КИРОВ', 'Кировская область', 'kirov')], terminals)).toEqual([])
		const orel = [{ name: 'Орел', region: 'Орёл', code: 'orel' }]
		expect(dedupeSettlements([place('Орёл', 'Орловская область', 'orel')], orel)).toEqual([])
	})

	it('НП с другим названием не трогает и сохраняет порядок', () => {
		const a = place('Кирово', 'Кировская область', 'kirov')
		const b = place('Кировск', 'Мурманская область', 'murmansk')
		expect(dedupeSettlements([a, b], terminals)).toEqual([a, b])
	})

	it('Казань — не терминал: НП «Казань» (Татарстан) остаётся и считается по ближайшему терминалу', () => {
		expect(DIRECTIONS.some((d) => d.name === 'Казань')).toBe(false)
		const kazan = place('Казань', 'Республика Татарстан', 'zelenodolsk')
		expect(dedupeSettlements([kazan], DIRECTIONS)).toEqual([kazan])
	})
})
