import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { mapCargo } from '@/lib/mapCargo'

async function requireAuth() {
	const session = await getServerSession()
	if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	return null
}

// GET /api/cargos/[id] — получить груз по docId (auth)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const denied = await requireAuth()
	if (denied) return denied

	const { id } = await params
	const cargo = await prisma.cargo.findUnique({ where: { id } })
	if (!cargo) return NextResponse.json({ error: 'Not found' }, { status: 404 })
	return NextResponse.json(mapCargo(cargo))
}

// PATCH /api/cargos/[id] — обновить поля груза (auth)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const denied = await requireAuth()
	if (denied) return denied

	const { id } = await params
	const body = await req.json()

	const data: Record<string, unknown> = {}
	if (body.status !== undefined) data.status = body.status
	if (body.fromCity !== undefined) data.fromCity = body.fromCity
	if (body.toCity !== undefined) data.toCity = body.toCity
	if (body.currentCity !== undefined) data.currentCity = body.currentCity
	if (body.cargoNumber !== undefined) data.cargoNumber = body.cargoNumber != null && body.cargoNumber !== '' ? Number(body.cargoNumber) : null
	if (body.name !== undefined) data.name = body.name || null
	if (body.acceptanceDate !== undefined) data.acceptanceDate = body.acceptanceDate ? new Date(body.acceptanceDate) : null
	if (body.shipmentDate !== undefined) data.shipmentDate = body.shipmentDate ? new Date(body.shipmentDate) : null
	if (body.deliveryTimeframe !== undefined) data.deliveryTimeframe = body.deliveryTimeframe || null
	if (body.deliveryAmount !== undefined) data.deliveryAmount = body.deliveryAmount != null && body.deliveryAmount !== '' ? Number(body.deliveryAmount) : null
	if (body.paymentStatus !== undefined) data.paymentStatus = body.paymentStatus
	if (body.partialPaymentDetail !== undefined) data.partialPaymentDetail = body.partialPaymentDetail || null
	if (body.currency !== undefined) data.currency = body.currency
	if (body.folderId !== undefined) data.folderId = body.folderId || null

	if (Object.keys(data).length === 0) {
		return NextResponse.json({ error: 'Нет данных для обновления' }, { status: 400 })
	}

	const cargo = await prisma.cargo.update({ where: { id }, data })
	return NextResponse.json(mapCargo(cargo))
}

// DELETE /api/cargos/[id] — удалить груз (auth)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const denied = await requireAuth()
	if (denied) return denied

	const { id } = await params
	await prisma.cargo.delete({ where: { id } })
	return NextResponse.json({ success: true })
}
