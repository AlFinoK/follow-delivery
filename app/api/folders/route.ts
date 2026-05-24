import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/folders — список папок + количество активных грузов (status != прибыл)
export async function GET() {
	const folders = await prisma.folder.findMany({
		orderBy: { createdAt: 'desc' },
		include: {
			_count: {
				select: {
					cargos: { where: { status: { not: 'прибыл' } } },
				},
			},
		},
	})

	return NextResponse.json(
		folders.map((f) => ({
			id: f.id,
			name: f.name,
			cargoCount: f._count.cargos,
			createdAt: f.createdAt,
			updatedAt: f.updatedAt,
		})),
	)
}

// POST /api/folders — создать папку
export async function POST(req: NextRequest) {
	const body = await req.json()
	const name = typeof body.name === 'string' ? body.name.trim() : ''

	if (!name) {
		return NextResponse.json({ error: 'Название папки обязательно' }, { status: 400 })
	}

	const folder = await prisma.folder.create({ data: { name } })
	return NextResponse.json(
		{ id: folder.id, name: folder.name, cargoCount: 0, createdAt: folder.createdAt, updatedAt: folder.updatedAt },
		{ status: 201 },
	)
}
