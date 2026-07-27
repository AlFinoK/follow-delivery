import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { mapWaybill, waybillData, waybillErrors, waybillItems } from '@/lib/mapWaybill'
import { syncCargo } from '@/lib/waybill/cargoSync'
import { reserveWaybillNumber } from '@/lib/waybill/number'

const PAGE_SIZE = 12

// GET /api/waybills — список накладных для админки (auth).
// ?q=… — поиск по номеру, ФИО отправителя/получателя, городам, характеру груза
// ?status=draft|active|delivered|cancelled, ?page=N
// ?cargoId=… — накладная конкретного груза (блок «Накладная» на карточке груза)
// Возвращает { items, total, page, pageSize, counts }.
export async function GET(req: NextRequest) {
	const session = await getServerSession()
	if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

	const sp = req.nextUrl.searchParams
	const q = (sp.get('q') ?? '').trim()
	const status = sp.get('status')
	const cargoId = sp.get('cargoId')
	const page = Math.max(1, Number(sp.get('page')) || 1)

	const where: Prisma.WaybillWhereInput = {}
	if (status && status !== 'all') where.status = status
	if (cargoId) where.cargoId = cargoId
	if (q) {
		const asNum = Number(q)
		const ors: Prisma.WaybillWhereInput[] = [
			{ senderFullName: { contains: q, mode: 'insensitive' } },
			{ receiverFullName: { contains: q, mode: 'insensitive' } },
			{ receiverPhone: { contains: q, mode: 'insensitive' } },
			{ senderCity: { contains: q, mode: 'insensitive' } },
			{ receiverCity: { contains: q, mode: 'insensitive' } },
			{ nature: { contains: q, mode: 'insensitive' } },
		]
		if (Number.isInteger(asNum) && asNum > 0) ors.push({ number: asNum })
		where.OR = ors
	}

	const [items, total, groups] = await Promise.all([
		prisma.waybill.findMany({
			where,
			include: { items: true },
			orderBy: { createdAt: 'desc' },
			skip: (page - 1) * PAGE_SIZE,
			take: PAGE_SIZE,
		}),
		prisma.waybill.count({ where }),
		prisma.waybill.groupBy({ by: ['status'], _count: { _all: true } }),
	])

	const counts = { all: 0, draft: 0, active: 0, delivered: 0, cancelled: 0 }
	for (const g of groups) {
		counts.all += g._count._all
		if (g.status in counts) counts[g.status as keyof typeof counts] = g._count._all
	}

	return NextResponse.json({ items: items.map(mapWaybill), total, page, pageSize: PAGE_SIZE, counts })
}

// POST /api/waybills — создать накладную (auth). Номер берём из тела (его резервирует
// клиент при открытии формы через POST /api/waybills/number); если номера нет или он
// уже занят — выдаём новый и повторяем, чтобы сохранение не падало на UNIQUE.
export async function POST(req: NextRequest) {
	const session = await getServerSession()
	if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

	const body = (await req.json()) as Record<string, unknown>
	const data = waybillData(body)
	const error = waybillErrors(data)
	if (error) return NextResponse.json({ error }, { status: 400 })

	const items = waybillItems(body)
	let number = Number(body.number)
	if (!Number.isInteger(number) || number <= 0) number = await reserveWaybillNumber()

	// Сначала сама накладная: если номер всё же занят (например, его выдали до
	// восстановления базы), берём следующий и повторяем. Груз создаём ПОСЛЕ успеха,
	// иначе неудачная попытка оставила бы в трекере лишний CARGO-<номер>.
	let created = null
	for (let attempt = 0; attempt < 5 && !created; attempt++) {
		try {
			created = await prisma.waybill.create({
				data: { ...data, number, items: { create: items } },
				include: { items: true },
			})
		} catch (e) {
			if (!isUniqueNumberError(e)) throw e
			number = await reserveWaybillNumber()
		}
	}
	if (!created) return NextResponse.json({ error: 'Не удалось присвоить номер накладной' }, { status: 409 })

	// Груз в трекере — производная сущность. Если привязка не удалась (например,
	// CARGO-<номер> уже занят другой накладной), накладную всё равно отдаём: связь
	// восстановится при следующем сохранении.
	try {
		const cargoId = await syncCargo(number, data, null)
		const linked = await prisma.waybill.update({
			where: { id: created.id },
			data: { cargoId },
			include: { items: true },
		})
		return NextResponse.json(mapWaybill(linked), { status: 201 })
	} catch {
		return NextResponse.json(mapWaybill(created), { status: 201 })
	}
}

function isUniqueNumberError(e: unknown): boolean {
	const err = e as { code?: string; meta?: { target?: string[] | string } }
	if (err?.code !== 'P2002') return false
	const target = err.meta?.target
	const fields = Array.isArray(target) ? target.join(',') : String(target ?? '')
	return fields.includes('number')
}
