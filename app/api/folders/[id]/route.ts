import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function mapCargo(cargo: {
	id: string
	trackingId: string
	cargoNumber: number | null
	name: string | null
	fromCity: string
	currentCity: string
	toCity: string
	status: string
	acceptanceDate: Date | null
	shipmentDate: Date | null
	deliveryTimeframe: string | null
	deliveryAmount: number | null
	paymentStatus: string
	partialPaymentDetail: string | null
	currency: string
	folderId: string | null
	createdAt: Date
}) {
	return {
		docId: cargo.id,
		id: cargo.trackingId,
		cargoNumber: cargo.cargoNumber,
		name: cargo.name,
		fromCity: cargo.fromCity,
		currentCity: cargo.currentCity,
		toCity: cargo.toCity,
		status: cargo.status,
		acceptanceDate: cargo.acceptanceDate ? cargo.acceptanceDate.toISOString() : null,
		shipmentDate: cargo.shipmentDate ? cargo.shipmentDate.toISOString() : null,
		deliveryTimeframe: cargo.deliveryTimeframe,
		deliveryAmount: cargo.deliveryAmount,
		paymentStatus: cargo.paymentStatus,
		partialPaymentDetail: cargo.partialPaymentDetail,
		currency: cargo.currency,
		folderId: cargo.folderId,
		createdAt: cargo.createdAt,
	}
}

// GET /api/folders/[id] — папка + грузы внутри (включая доставленные, чтобы видеть историю — UI решит фильтрацию)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params
	const folder = await prisma.folder.findUnique({
		where: { id },
		include: { cargos: { orderBy: { createdAt: 'desc' } } },
	})
	if (!folder) return NextResponse.json({ error: 'Папка не найдена' }, { status: 404 })

	return NextResponse.json({
		id: folder.id,
		name: folder.name,
		createdAt: folder.createdAt,
		updatedAt: folder.updatedAt,
		cargos: folder.cargos.map(mapCargo),
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
