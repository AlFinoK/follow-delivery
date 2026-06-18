import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

function mapPreset(p: {
	id: string
	name: string
	category: string | null
	length: number
	width: number
	height: number
	weight: number
	basePrice: number
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

const numOrUndef = (v: unknown, min = 0): number | undefined => {
	const n = Number(v)
	return Number.isFinite(n) && n >= min ? n : undefined
}

// PATCH /api/presets/[id] — обновить пресет (auth)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const denied = await requireAuth()
	if (denied) return denied

	const { id } = await params
	const body = await req.json()

	const data: Record<string, unknown> = {}
	if (body.name !== undefined) {
		const name = String(body.name).trim()
		if (!name) return NextResponse.json({ error: 'Название обязательно' }, { status: 400 })
		data.name = name
	}
	if (body.category !== undefined) data.category = body.category ? String(body.category).trim() : null
	// неотрицательные числовые поля: переданное, но некорректное значение → 400 (а не молча → 0)
	for (const f of ['length', 'width', 'height', 'weight', 'basePrice'] as const) {
		if (body[f] === undefined) continue
		const n = numOrUndef(body[f])
		if (n === undefined) return NextResponse.json({ error: `Некорректное значение поля «${f}»` }, { status: 400 })
		data[f] = n
	}
	if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl ? String(body.imageUrl).trim() : null
	if (body.sortOrder !== undefined) {
		const n = numOrUndef(body.sortOrder, -1e9)
		if (n === undefined) return NextResponse.json({ error: 'Некорректный порядок сортировки' }, { status: 400 })
		data.sortOrder = n
	}
	if (body.active !== undefined) data.active = !!body.active

	if (Object.keys(data).length === 0) {
		return NextResponse.json({ error: 'Нет данных для обновления' }, { status: 400 })
	}

	const preset = await prisma.cargoPreset.update({ where: { id }, data })
	return NextResponse.json(mapPreset(preset))
}

// DELETE /api/presets/[id] — удалить пресет (auth)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const denied = await requireAuth()
	if (denied) return denied

	const { id } = await params
	await prisma.cargoPreset.delete({ where: { id } })
	return NextResponse.json({ success: true })
}
