import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { mapCargo } from '@/lib/mapCargo'
import { requireAuth } from '@/lib/auth'
import { badRequest, intParam, prismaErrorResponse, readJson } from '@/lib/apiUtil'

const PAGE_SIZE = 20
const MAX_NAME = 200

type TabKey = 'active' | 'delivered' | 'all'

// GET /api/folders/[id]:
//   ?tab=active|delivered|all (default: active)
//   ?page=N (за пределами диапазона зажимается до последней страницы)
// Возвращает { folder, items, total, page, pageSize, counts }
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const denied = await requireAuth()
	if (denied) return denied

	const { id } = await params

	const folder = await prisma.folder.findUnique({ where: { id } })
	if (!folder) return NextResponse.json({ error: 'Папка не найдена' }, { status: 404 })

	const sp = req.nextUrl.searchParams
	const rawTab = sp.get('tab') as TabKey | null
	const tab: TabKey = rawTab === 'delivered' || rawTab === 'all' ? rawTab : 'active'
	const requestedPage = intParam(sp.get('page'), 1)

	const where =
		tab === 'active'
			? { folderId: id, status: { not: 'прибыл' } }
			: tab === 'delivered'
				? { folderId: id, status: 'прибыл' }
				: { folderId: id }

	const [total, allCount, deliveredCount] = await Promise.all([
		prisma.cargo.count({ where }),
		prisma.cargo.count({ where: { folderId: id } }),
		prisma.cargo.count({ where: { folderId: id, status: 'прибыл' } }),
	])
	const page = Math.min(requestedPage, Math.max(1, Math.ceil(total / PAGE_SIZE)))
	const items = await prisma.cargo.findMany({
		where,
		orderBy: { createdAt: 'desc' },
		skip: (page - 1) * PAGE_SIZE,
		take: PAGE_SIZE,
	})

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
	const denied = await requireAuth()
	if (denied) return denied

	const { id } = await params
	const body = await readJson(req)
	if (!body) return badRequest('Некорректное тело запроса')
	const name = typeof body.name === 'string' ? body.name.trim() : ''

	if (!name) {
		return badRequest('Название папки обязательно')
	}
	if (name.length > MAX_NAME || name.includes('\u0000')) {
		return badRequest('Некорректное название папки')
	}

	try {
		const folder = await prisma.folder.update({ where: { id }, data: { name } })
		return NextResponse.json({ id: folder.id, name: folder.name, createdAt: folder.createdAt, updatedAt: folder.updatedAt })
	} catch (e) {
		const mapped = prismaErrorResponse(e)
		if (mapped) return mapped
		throw e
	}
}

// DELETE /api/folders/[id] — удалить папку (грузы открепляются автоматически через onDelete: SetNull)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const denied = await requireAuth()
	if (denied) return denied

	const { id } = await params
	try {
		await prisma.folder.delete({ where: { id } })
	} catch (e) {
		const mapped = prismaErrorResponse(e)
		if (mapped) return mapped
		throw e
	}
	return NextResponse.json({ success: true })
}
