import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { DIRECTIONS, RUB_TO_KZT } from '@/lib/calculator/config'
import { priceByVolume, priceByWeight } from '@/lib/calculator/engine'
import { DEFAULT_PRESETS, presetVolumeM3 } from '@/lib/calculator/presets'

// Базовая цена-оценка для сида: считаем движком (Москва, без надбавки/мин.тарифа)
// и округляем до 100 ₸. Менеджеры затем правят цену вручную в админке.
function estimateBasePrice(p: { length: number; width: number; height: number; weight: number }): number {
	const ref = DIRECTIONS.find((d) => d.code === 'moskva-butovo') ?? DIRECTIONS[0]
	if (!ref) return 0
	const volume = presetVolumeM3(p)
	const rub = Math.max(priceByWeight(ref.w, p.weight), priceByVolume(ref.v, volume))
	return Math.round((rub * RUB_TO_KZT) / 100) * 100
}

// POST /api/presets/seed — загрузить стандартные пресеты из ТЗ (auth).
//   по умолчанию вставляет, только если таблица пуста;
//   ?force=1 — удалить все и пересоздать (в одной транзакции; себестоимость товара
//   goodsPrice сохраняется по названию шаблона).
export async function POST(req: NextRequest) {
	const denied = await requireAuth()
	if (denied) return denied

	const force = req.nextUrl.searchParams.get('force') === '1'
	const existing = await prisma.cargoPreset.count()

	if (existing > 0 && !force) {
		return NextResponse.json({ seeded: 0, existing, message: 'Пресеты уже есть' })
	}

	// deleteMany + createMany без транзакции: сбой на вставке оставлял пустую таблицу, а
	// заполненную вручную себестоимость (goodsPrice) пересоздание обнуляло.
	const result = await prisma.$transaction(async (tx) => {
		const goodsByName = new Map<string, number>()
		if (force) {
			const old = await tx.cargoPreset.findMany({ select: { name: true, goodsPrice: true } })
			for (const o of old) {
				// при одинаковых названиях берём ненулевую цену
				if (o.goodsPrice > 0 || !goodsByName.has(o.name)) goodsByName.set(o.name, o.goodsPrice)
			}
			await tx.cargoPreset.deleteMany({})
		}

		const data = DEFAULT_PRESETS.map((p) => ({
			name: p.name,
			category: p.category,
			length: p.length,
			width: p.width,
			height: p.height,
			weight: p.weight,
			basePrice: estimateBasePrice(p),
			goodsPrice: goodsByName.get(p.name) ?? 0,
			sortOrder: p.sortOrder,
			active: true,
		}))

		return tx.cargoPreset.createMany({ data })
	})
	return NextResponse.json({ seeded: result.count })
}
