// Сидирование пресетов из ТЗ напрямую в БД (без сервера/авторизации).
// Базовая цена оценивается так же, как /api/presets/seed: движком по Москве.
// Запуск:  node --env-file-if-exists=.env --env-file-if-exists=.env.local scripts/seed-presets.mjs [--force]
import { PrismaClient } from '@prisma/client'
import fs from 'node:fs'
import path from 'node:path'

const W_STEP = [1, 3, 5, 15, 35]
const W_LIN = [35, 50, 75, 100, 125, 150, 200, 250, 300, 500, 600, 1000, 1500, 2000, 5000, 20000]
const V_GRID = [0.1, 0.25, 0.5, 0.75, 1, 2, 3, 5, 10, 20]
const RUB_TO_KZT = 5.8

// зеркало priceByWeight из lib/calculator/engine.ts
function priceByWeight(curve, weight) {
	if (weight <= 0) return 0
	if (weight <= W_STEP[W_STEP.length - 1]) {
		for (const p of W_STEP) if (weight <= p) return curve[String(p)]
		return curve[String(W_STEP[W_STEP.length - 1])]
	}
	const last = W_LIN[W_LIN.length - 1]
	if (weight >= last) {
		const prev = W_LIN[W_LIN.length - 2]
		const rate = (curve[String(last)] - curve[String(prev)]) / (last - prev)
		return curve[String(last)] + rate * (weight - last)
	}
	for (let i = 1; i < W_LIN.length; i++) {
		const w0 = W_LIN[i - 1], w1 = W_LIN[i]
		if (weight <= w1) {
			const t = (weight - w0) / (w1 - w0)
			return curve[String(w0)] + t * (curve[String(w1)] - curve[String(w0)])
		}
	}
	return curve[String(last)]
}
// зеркало priceByVolume
function priceByVolume(curve, volume) {
	if (volume <= 0) return 0
	const first = V_GRID[0]
	if (volume <= first) return curve[String(first)] * (volume / first)
	const last = V_GRID[V_GRID.length - 1]
	if (volume >= last) {
		const prev = V_GRID[V_GRID.length - 2]
		const rate = (curve[String(last)] - curve[String(prev)]) / (last - prev)
		return curve[String(last)] + rate * (volume - last)
	}
	for (let i = 1; i < V_GRID.length; i++) {
		const v0 = V_GRID[i - 1], v1 = V_GRID[i]
		if (volume <= v1) {
			const t = (volume - v0) / (v1 - v0)
			return curve[String(v0)] + t * (curve[String(v1)] - curve[String(v0)])
		}
	}
	return curve[String(last)]
}

const DEFAULT_PRESETS = [
	{ name: 'Электровелосипед SK8', category: 'Электро', length: 130, width: 35, height: 60, weight: 35, sortOrder: 1 },
	{ name: 'Мопед', category: 'Мото', length: 180, width: 45, height: 80, weight: 160, sortOrder: 2 },
	{ name: 'Мотоцикл', category: 'Мото', length: 180, width: 45, height: 80, weight: 150, sortOrder: 3 },
	{ name: 'Питбайк', category: 'Мото', length: 129, width: 45, height: 62, weight: 95, sortOrder: 4 },
	{ name: 'Трицикл маленький', category: 'Трицикл', length: 120, width: 64, height: 64, weight: 60, sortOrder: 5 },
	{ name: 'Трицикл средний', category: 'Трицикл', length: 140, width: 70, height: 70, weight: 70, sortOrder: 6 },
	{ name: 'Трицикл большой', category: 'Трицикл', length: 170, width: 75, height: 80, weight: 80, sortOrder: 7 },
	{ name: 'Квадроцикл 200 куб. см', category: 'Квадроцикл', length: 190, width: 90, height: 90, weight: 260, sortOrder: 8 },
	{ name: 'Квадроцикл 300 куб. см', category: 'Квадроцикл', length: 200, width: 90, height: 90, weight: 280, sortOrder: 9 },
	{ name: 'Квадроцикл 350 куб. см', category: 'Квадроцикл', length: 205, width: 100, height: 90, weight: 300, sortOrder: 10 },
	{ name: 'Квадроцикл 400 куб. см', category: 'Квадроцикл', length: 210, width: 110, height: 90, weight: 350, sortOrder: 11 },
	{ name: 'Квадроцикл 500 куб. см', category: 'Квадроцикл', length: 215, width: 110, height: 100, weight: 450, sortOrder: 12 },
	{ name: 'Квадроцикл 600 куб. см', category: 'Квадроцикл', length: 220, width: 115, height: 100, weight: 480, sortOrder: 13 },
	{ name: 'Квадроцикл 650 куб. см', category: 'Квадроцикл', length: 220, width: 115, height: 100, weight: 480, sortOrder: 14 },
	{ name: 'Квадроцикл 700 куб. см', category: 'Квадроцикл', length: 220, width: 120, height: 100, weight: 500, sortOrder: 15 },
	{ name: 'Квадроцикл 1000 куб. см', category: 'Квадроцикл', length: 235, width: 140, height: 140, weight: 600, sortOrder: 16 },
]

const dirs = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'lib', 'calculator', 'directions.json'), 'utf8'))
const ref = dirs.find((d) => d.code === 'moskva-butovo') || dirs[0]
const estimate = (p) => {
	const vol = (p.length * p.width * p.height) / 1_000_000
	const rub = Math.max(priceByWeight(ref.w, p.weight), priceByVolume(ref.v, vol))
	return Math.round((rub * RUB_TO_KZT) / 100) * 100
}

const prisma = new PrismaClient()
const force = process.argv.includes('--force')
const existing = await prisma.cargoPreset.count()
if (existing > 0 && !force) {
	console.log(`Пресеты уже есть (${existing}). Для пересоздания: --force`)
	await prisma.$disconnect()
	process.exit(0)
}
if (force) await prisma.cargoPreset.deleteMany({})

const data = DEFAULT_PRESETS.map((p) => ({
	name: p.name, category: p.category, length: p.length, width: p.width, height: p.height,
	weight: p.weight, basePrice: estimate(p), sortOrder: p.sortOrder, active: true,
}))
const res = await prisma.cargoPreset.createMany({ data })
console.log('Засеяно пресетов:', res.count)
for (const d of data) console.log('  -', d.name, '|', d.basePrice, '₸')
await prisma.$disconnect()
