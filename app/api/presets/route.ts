import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

// Форма пресета в JSON (совпадает с lib/calculator/presets.ts → Preset).
// goodsPrice (себестоимость товара) — только для авторизованных: калькулятор открыт
// клиентам, и внутренние цены техники им отдавать нельзя (ПРАВКИ 2, п.1).
function mapPreset(
	p: {
		id: string
		name: string
		category: string | null
		length: number
		width: number
		height: number
		weight: number
		basePrice: number
		goodsPrice: number
		imageUrl: string | null
		sortOrder: number
		active: boolean
	},
	withGoodsPrice = true
) {
	return {
		id: p.id,
		name: p.name,
		category: p.category,
		length: p.length,
		width: p.width,
		height: p.height,
		weight: p.weight,
		basePrice: p.basePrice,
		goodsPrice: withGoodsPrice ? p.goodsPrice : 0,
		imageUrl: p.imageUrl,
		sortOrder: p.sortOrder,
		active: p.active,
	}
}

async function requireAuth() {
	const session = await getServerSession()
	if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	return null
}

// GET /api/presets — список пресетов для калькулятора.
//   по умолчанию — только активные (публично, без себестоимости товара);
//   ?all=1 — включая скрытые (для админки, требует auth).
export async function GET(req: NextRequest) {
	const all = req.nextUrl.searchParams.get('all') === '1'
	if (all) {
		const denied = await requireAuth()
		if (denied) return denied
	}

	// Для админского калькулятора (создание накладной) себестоимость нужна, поэтому
	// отдаём её любому авторизованному, а не только при ?all=1.
	const authed = all || !!(await getServerSession())

	const presets = await prisma.cargoPreset.findMany({
		where: all ? {} : { active: true },
		orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
	})
	return NextResponse.json(presets.map((p) => mapPreset(p, authed)))
}

// POST /api/presets — создать пресет (auth)
export async function POST(req: NextRequest) {
	const denied = await requireAuth()
	if (denied) return denied

	const body = await req.json()
	const name = typeof body.name === 'string' ? body.name.trim() : ''
	if (!name) return NextResponse.json({ error: 'Название обязательно' }, { status: 400 })

	// если поле передано, но это не корректное неотрицательное число — отклоняем (а не молча → 0)
	for (const f of ['length', 'width', 'height', 'weight', 'basePrice', 'goodsPrice'] as const) {
		const v = body[f]
		if (v !== undefined && v !== null && v !== '') {
			const n = Number(v)
			if (!Number.isFinite(n) || n < 0) {
				return NextResponse.json({ error: `Некорректное значение поля «${f}»` }, { status: 400 })
			}
		}
	}
	if (body.sortOrder !== undefined && body.sortOrder !== '' && !Number.isFinite(Number(body.sortOrder))) {
		return NextResponse.json({ error: 'Некорректный порядок сортировки' }, { status: 400 })
	}

	const num = (v: unknown, min = 0) => {
		const n = Number(v)
		return Number.isFinite(n) && n >= min ? n : 0
	}

	const preset = await prisma.cargoPreset.create({
		data: {
			name,
			category: body.category ? String(body.category).trim() : null,
			length: num(body.length),
			width: num(body.width),
			height: num(body.height),
			weight: num(body.weight),
			basePrice: num(body.basePrice),
			goodsPrice: num(body.goodsPrice),
			imageUrl: body.imageUrl ? String(body.imageUrl).trim() : null,
			sortOrder: Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0,
			active: body.active === undefined ? true : !!body.active,
		},
	})
	return NextResponse.json(mapPreset(preset), { status: 201 })
}
