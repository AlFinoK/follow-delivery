import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { badRequest, prismaErrorResponse, readJson } from '@/lib/apiUtil'

function mapPreset(p: {
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
}) {
	return {
		id: p.id,
		name: p.name,
		category: p.category,
		length: p.length,
		width: p.width,
		height: p.height,
		weight: p.weight,
		basePrice: p.basePrice,
		goodsPrice: p.goodsPrice,
		imageUrl: p.imageUrl,
		sortOrder: p.sortOrder,
		active: p.active,
	}
}

const numOrUndef = (v: unknown, min = 0): number | undefined => {
	const n = Number(v)
	return Number.isFinite(n) && n >= min ? n : undefined
}

// PATCH /api/presets/[id] — обновить пресет (auth)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const denied = await requireAuth()
	if (denied) return denied

	const { id } = await params
	const body = await readJson(req)
	if (!body) return badRequest('Некорректное тело запроса')

	const data: Record<string, unknown> = {}
	if (body.name !== undefined) {
		const name = String(body.name).trim()
		if (!name) return NextResponse.json({ error: 'Название обязательно' }, { status: 400 })
		data.name = name
	}
	if (body.category !== undefined) data.category = body.category ? String(body.category).trim() : null
	// неотрицательные числовые поля: переданное, но некорректное значение → 400 (а не молча → 0)
	for (const f of ['length', 'width', 'height', 'weight', 'basePrice', 'goodsPrice'] as const) {
		if (body[f] === undefined) continue
		const n = numOrUndef(body[f])
		if (n === undefined) return NextResponse.json({ error: `Некорректное значение поля «${f}»` }, { status: 400 })
		data[f] = n
	}
	if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl ? String(body.imageUrl).trim() : null
	if (body.sortOrder !== undefined) {
		// sortOrder — Int в БД: дробное и значения за пределами ±1e9 отклоняем (иначе Prisma → 500)
		const n = numOrUndef(body.sortOrder, -1e9)
		if (n === undefined || !Number.isInteger(n) || n > 1e9) return NextResponse.json({ error: 'Некорректный порядок сортировки' }, { status: 400 })
		data.sortOrder = n
	}
	if (body.active !== undefined) data.active = !!body.active

	if (Object.keys(data).length === 0) {
		return NextResponse.json({ error: 'Нет данных для обновления' }, { status: 400 })
	}

	try {
		const preset = await prisma.cargoPreset.update({ where: { id }, data })
		return NextResponse.json(mapPreset(preset))
	} catch (e) {
		// P2025 — шаблона нет → 404 (раньше 500)
		const mapped = prismaErrorResponse(e)
		if (mapped) return mapped
		throw e
	}
}

// DELETE /api/presets/[id] — удалить пресет (auth)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const denied = await requireAuth()
	if (denied) return denied

	const { id } = await params
	try {
		await prisma.cargoPreset.delete({ where: { id } })
	} catch (e) {
		const mapped = prismaErrorResponse(e)
		if (mapped) return mapped
		throw e
	}
	return NextResponse.json({ success: true })
}
