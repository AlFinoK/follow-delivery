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

// GET /api/cargos — все грузы (админ) или поиск по trackingId (клиент)
export async function GET(req: NextRequest) {
	const trackingId = req.nextUrl.searchParams.get('trackingId')

	if (trackingId) {
		const cargo = await prisma.cargo.findFirst({
			where: { trackingId: { equals: trackingId.toUpperCase().trim(), mode: 'insensitive' } },
		})
		if (!cargo) return NextResponse.json({ error: 'Груз не найден' }, { status: 404 })
		return NextResponse.json(mapCargo(cargo))
	}

	const cargos = await prisma.cargo.findMany({ orderBy: { createdAt: 'desc' } })
	return NextResponse.json(cargos.map(mapCargo))
}

// POST /api/cargos — создать груз
export async function POST(req: NextRequest) {
	const body = await req.json()

	if (!body.id || !body.fromCity || !body.toCity || !body.currentCity || !body.status) {
		return NextResponse.json({ error: 'Заполните все обязательные поля' }, { status: 400 })
	}

	const cargo = await prisma.cargo.create({
		data: {
			trackingId: (body.id as string).toUpperCase().trim(),
			cargoNumber: body.cargoNumber != null && body.cargoNumber !== '' ? Number(body.cargoNumber) : null,
			name: body.name || null,
			fromCity: body.fromCity,
			currentCity: body.currentCity,
			toCity: body.toCity,
			status: body.status,
			acceptanceDate: body.acceptanceDate ? new Date(body.acceptanceDate) : null,
			shipmentDate: body.shipmentDate ? new Date(body.shipmentDate) : null,
			deliveryTimeframe: body.deliveryTimeframe || null,
			deliveryAmount: body.deliveryAmount != null && body.deliveryAmount !== '' ? Number(body.deliveryAmount) : null,
			paymentStatus: body.paymentStatus || 'none',
			partialPaymentDetail: body.partialPaymentDetail || null,
			currency: body.currency || 'KZT',
		},
	})

	return NextResponse.json(mapCargo(cargo), { status: 201 })
}
