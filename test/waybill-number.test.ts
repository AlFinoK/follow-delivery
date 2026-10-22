import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { TEST_DB_URL, uniquePrefix, useTestDatabase } from './helpers/db'

// T2: номер накладной не должен сталкиваться с номерами грузов, набранными вручную, и
// с уже существующими накладными — ни при обычной выдаче, ни при первом создании счётчика.
//
// ⚠️ Файлы тестов делят одну БД: номера других файлов только увеличивают максимум, поэтому
// все проверки здесь относительные («больше», «различны»), а не точные значения.

describe.skipIf(!TEST_DB_URL)('reserveWaybillNumber (БД)', () => {
	type Prisma = typeof import('@/lib/prisma').prisma
	let prisma: Prisma
	let reserve: () => Promise<number>
	const P = uniquePrefix('WN')
	// Заведомо выше всего, что выдают другие файлы, — иначе проверка ничего не доказывает.
	const manual = 7_000_000 + Math.floor(Math.random() * 100_000)

	beforeAll(async () => {
		useTestDatabase()
		;({ prisma } = await import('@/lib/prisma'))
		;({ reserveWaybillNumber: reserve } = await import('@/lib/waybill/number'))
	})

	afterAll(async () => {
		await prisma.cargo.deleteMany({ where: { trackingId: { startsWith: `CARGO-${P}` } } })
	})

	it('груз с ручным номером выше счётчика: следующий номер больше него', async () => {
		await prisma.$executeRaw`
			INSERT INTO "WaybillCounter" ("id", "value") VALUES ('main', 3000)
			ON CONFLICT ("id") DO UPDATE SET "value" = 3000`
		await prisma.cargo.create({
			data: { trackingId: `CARGO-${P}-1`, cargoNumber: manual, fromCity: 'Алматы', currentCity: 'Алматы', toCity: 'Москва' },
		})
		expect(await reserve()).toBeGreaterThan(manual)
	})

	it('первое создание счётчика не начинает с 3000 ниже существующих номеров', async () => {
		await prisma.$executeRaw`DELETE FROM "WaybillCounter" WHERE "id" = 'main'`
		const n = await reserve()
		expect(n).toBeGreaterThan(manual)
	})

	it('огромный номер груза (почти int32) не ломает выдачу', async () => {
		const big = await prisma.cargo.create({
			data: { trackingId: `CARGO-${P}-2`, cargoNumber: 2147483647, fromCity: 'Алматы', currentCity: 'Алматы', toCity: 'Москва' },
		})
		const n = await reserve().finally(() => prisma.cargo.delete({ where: { id: big.id } }))
		expect(Number.isInteger(n)).toBe(true)
		expect(n).toBeLessThan(2147483647)
	})

	it('10 параллельных выдач — все номера различны', async () => {
		const nums = await Promise.all(Array.from({ length: 10 }, () => reserve()))
		expect(new Set(nums).size).toBe(10)
	})
})
