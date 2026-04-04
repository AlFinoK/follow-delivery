import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function mapCargo(cargo: {
	id: string
	trackingId: string
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
	createdAt: Date
}) {
	return {
		docId: cargo.id,
		id: cargo.trackingId,
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
		createdAt: cargo.createdAt,
	}
}

// GET /api/cargos/[id] — получить груз по docId
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params
	const cargo = await prisma.cargo.findUnique({ where: { id } })
	if (!cargo) return NextResponse.json({ error: 'Not found' }, { status: 404 })
	return NextResponse.json(mapCargo(cargo))
}

// PATCH /api/cargos/[id] — обновить поля груза
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params
	const body = await req.json()

	const data: Record<string, unknown> = {}
	if (body.status !== undefined) data.status = body.status
	if (body.currentCity !== undefined) data.currentCity = body.currentCity
	if (body.name !== undefined) data.name = body.name || null
	if (body.acceptanceDate !== undefined) data.acceptanceDate = body.acceptanceDate ? new Date(body.acceptanceDate) : null
	if (body.shipmentDate !== undefined) data.shipmentDate = body.shipmentDate ? new Date(body.shipmentDate) : null
	if (body.deliveryTimeframe !== undefined) data.deliveryTimeframe = body.deliveryTimeframe || null
	if (body.deliveryAmount !== undefined) data.deliveryAmount = body.deliveryAmount != null && body.deliveryAmount !== '' ? Number(body.deliveryAmount) : null
	if (body.paymentStatus !== undefined) data.paymentStatus = body.paymentStatus
	if (body.partialPaymentDetail !== undefined) data.partialPaymentDetail = body.partialPaymentDetail || null
	if (body.currency !== undefined) data.currency = body.currency

	if (Object.keys(data).length === 0) {
		return NextResponse.json({ error: 'Нет данных для обновления' }, { status: 400 })
	}

	const cargo = await prisma.cargo.update({ where: { id }, data })
	return NextResponse.json(mapCargo(cargo))
}

// DELETE /api/cargos/[id] — удалить груз
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params
	await prisma.cargo.delete({ where: { id } })
	return NextResponse.json({ success: true })
}
