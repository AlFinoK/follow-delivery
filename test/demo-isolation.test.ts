import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { demoRepos } from '@/lib/data/demoRepo'
import { resetDemo, getCargos } from '@/lib/demo/store'
import type { CargoCreateInput } from '@/lib/data/types'

const mk = (over: Partial<CargoCreateInput> & Pick<CargoCreateInput, 'id'>): CargoCreateInput => ({
	fromCity: 'Алматы',
	currentCity: 'Алматы',
	toCity: 'Москва',
	status: 'ожидает отправления',
	...over,
})

describe('Демо-изоляция: реальные данные прода не затрагиваются', () => {
	beforeEach(() => resetDemo())

	it('demoRepo НЕ делает ни одного сетевого вызова (реальный бэкенд недоступен)', async () => {
		const fetchSpy = vi.fn(() => {
			throw new Error('СЕТЕВОЙ ВЫЗОВ ИЗ ДЕМО — недопустимо!')
		})
		;(globalThis as unknown as { fetch: unknown }).fetch = fetchSpy

		// Прогоняем всю поверхность demoRepo
		await demoRepos.cargos.list({})
		await demoRepos.cargos.search('CARGO-NONE')
		const c = await demoRepos.cargos.create(mk({ id: 'CARGO-T1', cargoNumber: 2085 }))
		await demoRepos.cargos.get(c.docId)
		await demoRepos.cargos.update(c.docId, { status: 'в пути' })
		const f = await demoRepos.folders.create('Рейс Алматы → Москва')
		await demoRepos.folders.list()
		await demoRepos.folders.get(f.id, {})
		await demoRepos.folders.addCargos(f.id, [2085])
		await demoRepos.folders.bulkUpdate(f.id, { currentCity: 'Астана' })
		await demoRepos.folders.rename(f.id, 'Рейс 2')
		await demoRepos.presets.list(true)
		await demoRepos.presets.seed()
		await demoRepos.cargos.remove(c.docId)
		await demoRepos.folders.remove(f.id)

		expect(fetchSpy).not.toHaveBeenCalled()
	})

	afterEach(() => {
		delete (globalThis as unknown as { fetch?: unknown }).fetch
	})

	it('песочница стартует ПУСТОЙ (никакие реальные данные не подмешиваются)', async () => {
		const res = await demoRepos.cargos.list({})
		expect(res.items).toHaveLength(0)
		expect(res.counts.all).toBe(0)
		expect(await demoRepos.folders.list()).toHaveLength(0)
	})

	it('CRUD целиком остаётся в sessionStorage-песочнице', async () => {
		const created = await demoRepos.cargos.create(mk({ id: 'CARGO-X', toCity: 'Казань', cargoNumber: 42 }))
		// запись лежит только в нашем in-memory sessionStorage, не в реальной БД
		expect(getCargos().map((c) => c.docId)).toContain(created.docId)
		expect((await demoRepos.cargos.list({})).total).toBe(1)

		const found = await demoRepos.cargos.search('42')
		expect(found?.cargoNumber).toBe(42)

		await demoRepos.cargos.remove(created.docId)
		expect((await demoRepos.cargos.list({})).total).toBe(0)
	})

	it('счётчики статусов — ГЛОБАЛЬНЫЕ (как groupBy без where в реальном API)', async () => {
		await demoRepos.cargos.create(mk({ id: 'C1', cargoNumber: 1, name: 'мототехника' }))
		await demoRepos.cargos.create(mk({ id: 'C2', cargoNumber: 2, name: 'квадроцикл', status: 'в пути' }))

		const res = await demoRepos.cargos.list({ q: 'мототехника' })
		// items отфильтрованы по q, но counts считаются по ВСЕМ грузам
		expect(res.items).toHaveLength(1)
		expect(res.counts.all).toBe(2)
		expect(res.counts.waiting).toBe(1)
		expect(res.counts.transit).toBe(1)
	})

	it('поиск по цифрам находит по cargoNumber ИЛИ trackingId (как реальный API)', async () => {
		await demoRepos.cargos.create(mk({ id: 'CARGO-777', cargoNumber: 100 }))
		expect((await demoRepos.cargos.search('100'))?.id).toBe('CARGO-777') // по номеру
		await demoRepos.cargos.create(mk({ id: '2085', cargoNumber: 999 }))
		expect((await demoRepos.cargos.search('2085'))?.cargoNumber).toBe(999) // по trackingId-цифрам
	})
})
