import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { mapCargo } from '@/lib/mapCargo'

const PAGE_SIZE = 8

function statusFromFilter(key: string | null): string | null {
	if (key === 'waiting') return 'ожидает отправления'
	if (key === 'transit') return 'в пути'
	if (key === 'arrived') return 'прибыл'
	return null
}

// GET /api/cargos:
//   - ?trackingId=XYZ — публичный поиск по трек-номеру ИЛИ по cargoNumber (если ввод цифрами)
//   - без trackingId — админский список с серверной пагинацией/фильтром, требует auth
//     поддерживает ?status=waiting|transit|arrived&q=...&page=N
//     возвращает { items, total, page, pageSize, counts }
export async function GET(req: NextRequest) {
	const trackingId = req.nextUrl.searchParams.get('trackingId')

	if (trackingId) {
		const raw = trackingId.trim()
		const asNumber = Number(raw)
		const isDigitOnly = /^\d+$/.test(raw) && Number.isInteger(asNumber) && asNumber > 0

		const where: Prisma.CargoWhereInput = isDigitOnly
			? { OR: [{ cargoNumber: asNumber }, { trackingId: { equals: raw.toUpperCase(), mode: 'insensitive' } }] }
			: { trackingId: { equals: raw.toUpperCase(), mode: 'insensitive' } }

		// Если ищут по cargoNumber и есть несколько — берём самый свежий не-доставленный, иначе самый свежий.
		const cargo = await prisma.cargo.findFirst({
			where,
			orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
		})
		if (!cargo) return NextResponse.json({ error: 'Груз не найден' }, { status: 404 })
		return NextResponse.json(mapCargo(cargo))
	}

	const session = await getServerSession()
	if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

	const sp = req.nextUrl.searchParams
	const status = statusFromFilter(sp.get('status'))
	const q = (sp.get('q') ?? '').trim()
	const page = Math.max(1, Number(sp.get('page')) || 1)

	const where: Prisma.CargoWhereInput = {}
	if (status) where.status = status
	if (q) {
		const asNum = Number(q)
		const ors: Prisma.CargoWhereInput[] = [
			{ trackingId: { contains: q, mode: 'insensitive' } },
			{ name: { contains: q, mode: 'insensitive' } },
			{ fromCity: { contains: q, mode: 'insensitive' } },
			{ toCity: { contains: q, mode: 'insensitive' } },
			{ currentCity: { contains: q, mode: 'insensitive' } },
		]
		if (Number.isInteger(asNum) && asNum > 0) ors.push({ cargoNumber: asNum })
		where.OR = ors
	}

	const [items, total, groups] = await Promise.all([
		prisma.cargo.findMany({
			where,
			orderBy: { createdAt: 'desc' },
			skip: (page - 1) * PAGE_SIZE,
			take: PAGE_SIZE,
		}),
		prisma.cargo.count({ where }),
		prisma.cargo.groupBy({ by: ['status'], _count: { _all: true } }),
	])

	const counts = { all: 0, waiting: 0, transit: 0, arrived: 0 }
	for (const g of groups) {
		counts.all += g._count._all
		if (g.status === 'ожидает отправления') counts.waiting = g._count._all
		else if (g.status === 'в пути') counts.transit = g._count._all
		else if (g.status === 'прибыл') counts.arrived = g._count._all
	}

	return NextResponse.json({
		items: items.map(mapCargo),
		total,
		page,
		pageSize: PAGE_SIZE,
		counts,
	})
}

// POST /api/cargos — создать груз (auth)
export async function POST(req: NextRequest) {
	const session = await getServerSession()
	if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
