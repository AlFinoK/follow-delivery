import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
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
//   ?force=1 — удалить все и пересоздать.
export async function POST(req: NextRequest) {
	const session = await getServerSession()
	if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

	const force = req.nextUrl.searchParams.get('force') === '1'
	const existing = await prisma.cargoPreset.count()

	if (existing > 0 && !force) {
		return NextResponse.json({ seeded: 0, existing, message: 'Пресеты уже есть' })
	}
	if (force) await prisma.cargoPreset.deleteMany({})

	const data = DEFAULT_PRESETS.map((p) => ({
		name: p.name,
		category: p.category,
		length: p.length,
		width: p.width,
		height: p.height,
		weight: p.weight,
		basePrice: estimateBasePrice(p),
		sortOrder: p.sortOrder,
		active: true,
	}))

	const result = await prisma.cargoPreset.createMany({ data })
	return NextResponse.json({ seeded: result.count })
}
