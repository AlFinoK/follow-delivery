import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { mapWaybill, waybillData, waybillErrors, waybillItems } from '@/lib/mapWaybill'
import { syncCargo } from '@/lib/waybill/cargoSync'

async function requireAuth() {
	const session = await getServerSession()
	if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	return null
}

// GET /api/waybills/[id] — накладная по id, с позициями (auth)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const denied = await requireAuth()
	if (denied) return denied

	const { id } = await params
	const waybill = await prisma.waybill.findUnique({ where: { id }, include: { items: true } })
	if (!waybill) return NextResponse.json({ error: 'Not found' }, { status: 404 })
	return NextResponse.json(mapWaybill(waybill))
}

// PATCH /api/waybills/[id] — сохранить правки уже созданной накладной (ПРАВКИ 2, п.6).
// Номер накладной не меняется. Позиции переписываются целиком (delete + create):
// их порядок и состав задаёт форма, точечный diff здесь ничего не даёт.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const denied = await requireAuth()
	if (denied) return denied

	const { id } = await params
	const existing = await prisma.waybill.findUnique({ where: { id }, select: { number: true, cargoId: true } })
	if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

	const body = (await req.json()) as Record<string, unknown>
	const data = waybillData(body)
	const error = waybillErrors(data)
	if (error) return NextResponse.json({ error }, { status: 400 })

	// Сначала сама накладная (источник истины), затем производный груз — иначе при
	// сбое записи в трекере оказались бы данные, которых в накладной нет.
	const updated = await prisma.$transaction(async (tx) => {
		await tx.waybillItem.deleteMany({ where: { waybillId: id } })
		return tx.waybill.update({
			where: { id },
			data: { ...data, items: { create: waybillItems(body) } },
			include: { items: true },
		})
	})

	try {
		const cargoId = await syncCargo(existing.number, data, existing.cargoId)
		if (cargoId !== existing.cargoId) {
			return NextResponse.json(
				mapWaybill(await prisma.waybill.update({ where: { id }, data: { cargoId }, include: { items: true } }))
			)
		}
	} catch {
		/* груз — производная сущность: связь восстановится при следующем сохранении */
	}

	return NextResponse.json(mapWaybill(updated))
}

// DELETE /api/waybills/[id] — удалить накладную (auth). Позиции уходят каскадом,
// связанный груз в трекере остаётся: его историю ведёт логист отдельно.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const denied = await requireAuth()
	if (denied) return denied

	const { id } = await params
	await prisma.waybill.delete({ where: { id } })
	return NextResponse.json({ success: true })
}
