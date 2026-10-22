import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { badRequest, readJson } from '@/lib/apiUtil'

const MAX_NAME = 200

// Проверка сессии стоит в КАЖДОМ обработчике, а не только в middleware: matcher легко
// потерять при правке, а API без собственной проверки тогда открыт всему интернету.

// GET /api/folders — список папок + количество грузов: активных (status != прибыл),
// прибывших и всего. Счётчики по статусам — одним groupBy на все папки, без N+1.
export async function GET() {
	const denied = await requireAuth()
	if (denied) return denied

	const folders = await prisma.folder.findMany({ orderBy: { createdAt: 'desc' } })
	const groups = await prisma.cargo.groupBy({
		by: ['folderId', 'status'],
		where: { folderId: { in: folders.map((f) => f.id) } },
		_count: { _all: true },
	})
	const counts = new Map<string, { active: number; delivered: number }>()
	for (const g of groups) {
		if (!g.folderId) continue
		const c = counts.get(g.folderId) ?? { active: 0, delivered: 0 }
		if (g.status === 'прибыл') c.delivered += g._count._all
		else c.active += g._count._all
		counts.set(g.folderId, c)
	}

	return NextResponse.json(
		folders.map((f) => {
			const c = counts.get(f.id) ?? { active: 0, delivered: 0 }
			return {
				id: f.id,
				name: f.name,
				cargoCount: c.active,
				deliveredCount: c.delivered,
				totalCount: c.active + c.delivered,
				createdAt: f.createdAt,
				updatedAt: f.updatedAt,
			}
		}),
	)
}

// POST /api/folders — создать папку
export async function POST(req: NextRequest) {
	const denied = await requireAuth()
	if (denied) return denied

	const body = await readJson(req)
	if (!body) return badRequest('Некорректное тело запроса')
	const name = typeof body.name === 'string' ? body.name.trim() : ''

	if (!name) {
		return badRequest('Название папки обязательно')
	}
	if (name.length > MAX_NAME || name.includes('\u0000')) {
		return badRequest('Некорректное название папки')
	}

	const folder = await prisma.folder.create({ data: { name } })
	return NextResponse.json(
		{ id: folder.id, name: folder.name, cargoCount: 0, createdAt: folder.createdAt, updatedAt: folder.updatedAt },
		{ status: 201 },
	)
}
