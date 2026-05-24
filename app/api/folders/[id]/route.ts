import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { mapCargo } from '@/lib/mapCargo'

const PAGE_SIZE = 20

type TabKey = 'active' | 'delivered' | 'all'

// GET /api/folders/[id]:
//   ?tab=active|delivered|all (default: active)
//   ?page=N
// Возвращает { folder, items, total, page, pageSize, counts }
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params

	const folder = await prisma.folder.findUnique({ where: { id } })
	if (!folder) return NextResponse.json({ error: 'Папка не найдена' }, { status: 404 })

	const sp = req.nextUrl.searchParams
	const rawTab = sp.get('tab') as TabKey | null
	const tab: TabKey = rawTab === 'delivered' || rawTab === 'all' ? rawTab : 'active'
	const page = Math.max(1, Number(sp.get('page')) || 1)

	const where =
		tab === 'active'
			? { folderId: id, status: { not: 'прибыл' } }
			: tab === 'delivered'
				? { folderId: id, status: 'прибыл' }
				: { folderId: id }

	const [items, total, allCount, deliveredCount] = await Promise.all([
		prisma.cargo.findMany({
			where,
			orderBy: { createdAt: 'desc' },
			skip: (page - 1) * PAGE_SIZE,
			take: PAGE_SIZE,
		}),
		prisma.cargo.count({ where }),
		prisma.cargo.count({ where: { folderId: id } }),
		prisma.cargo.count({ where: { folderId: id, status: 'прибыл' } }),
	])

	return NextResponse.json({
		folder: {
			id: folder.id,
			name: folder.name,
			createdAt: folder.createdAt,
			updatedAt: folder.updatedAt,
		},
		items: items.map(mapCargo),
		total,
		page,
		pageSize: PAGE_SIZE,
		counts: {
			all: allCount,
			active: allCount - deliveredCount,
			delivered: deliveredCount,
		},
	})
}

// PATCH /api/folders/[id] — переименовать
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params
	const body = await req.json()
	const name = typeof body.name === 'string' ? body.name.trim() : ''

	if (!name) {
		return NextResponse.json({ error: 'Название папки обязательно' }, { status: 400 })
	}

	const folder = await prisma.folder.update({ where: { id }, data: { name } })
	return NextResponse.json({ id: folder.id, name: folder.name, createdAt: folder.createdAt, updatedAt: folder.updatedAt })
}

// DELETE /api/folders/[id] — удалить папку (грузы открепляются автоматически через onDelete: SetNull)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params
	await prisma.folder.delete({ where: { id } })
	return NextResponse.json({ success: true })
}
