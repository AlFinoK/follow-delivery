import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { badRequest, prismaErrorResponse, readJson } from '@/lib/apiUtil'
import { lastNotifications, mapWaybill, parseStatus, waybillData, waybillErrors, waybillItems } from '@/lib/mapWaybill'
import { syncAndLink } from '@/lib/waybill/cargoSync'
import { notifyAfterSave } from '@/lib/notify/auto'

// Перевод накладной в «Активна» запускает автоуведомление, а оно ждёт подтверждения
// доставки от WhatsApp (см. maxDuration в /api/notify). Само уведомление ограничено
// дедлайном 20 с, так что ответ придёт раньше 30 с.
export const maxDuration = 30

// GET /api/waybills/[id] — накладная по id, с позициями и последним уведомлением клиенту (auth)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const denied = await requireAuth()
	if (denied) return denied

	const { id } = await params
	const waybill = await prisma.waybill.findUnique({ where: { id }, include: { items: true } })
	if (!waybill) return NextResponse.json({ error: 'Not found' }, { status: 404 })
	const notes = await lastNotifications(prisma, [waybill.id])
	return NextResponse.json({ ...mapWaybill(waybill), lastNotification: notes.get(waybill.id) ?? null })
}

// PATCH /api/waybills/[id] — сохранить правки уже созданной накладной (ПРАВКИ 2, п.6).
// Номер накладной не меняется. Позиции переписываются целиком (delete + create):
// их порядок и состав задаёт форма, точечный diff здесь ничего не даёт.
//
// Тело обязано содержать `status` и массив `positions` (форма шлёт их всегда): раньше
// запрос без них молча сбрасывал накладную в черновик и удалял все позиции.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const denied = await requireAuth()
	if (denied) return denied

	const { id } = await params
	const body = await readJson(req)
	if (!body) return badRequest('Некорректное тело запроса')
	if (!parseStatus(body.status)) return badRequest('Не указан статус накладной')
	if (!Array.isArray(body.positions)) return badRequest('Не переданы позиции накладной')

	const data = waybillData(body)
	const error = waybillErrors(data)
	if (error) return badRequest(error)
	const items = waybillItems(body)

	// Сначала сама накладная (источник истины), затем производный груз — иначе при
	// сбое записи в трекере оказались бы данные, которых в накладной нет.
	//
	// Предыдущий статус читаем ВНУТРИ транзакции под блокировкой строки (FOR UPDATE):
	// два одновременных сохранения «черновик → активна» иначе оба видели бы draft и оба
	// писали бы клиенту. Второе теперь ждёт первое и видит уже active.
	let saved
	try {
		saved = await prisma.$transaction(async (tx) => {
			const rows = await tx.$queryRaw<{ status: string; number: number; cargoId: string | null }[]>`
				SELECT "status", "number", "cargoId" FROM "Waybill" WHERE "id" = ${id} FOR UPDATE`
			const prev = rows[0]
			if (!prev) throw Object.assign(new Error('Not found'), { code: 'P2025' })

			await tx.waybillItem.deleteMany({ where: { waybillId: id } })
			const updated = await tx.waybill.update({
				where: { id },
				data: { ...data, items: { create: items } },
				include: { items: true },
			})
			return { prev, updated }
		})
	} catch (e) {
		const known = prismaErrorResponse(e)
		if (known) return known
		throw e
	}

	const { prev, updated } = saved
	let result = mapWaybill(updated)
	const synced = await syncAndLink({ id, number: prev.number, cargoId: prev.cargoId }, data)
	if (synced.ok) result = { ...result, cargoId: synced.cargoId }

	// Черновик перевели в «активна» — значит накладная оформлена, уведомляем клиента.
	const notified = await notifyAfterSave(result, prev.status, synced.ok)
	return NextResponse.json({ ...result, notified })
}

// DELETE /api/waybills/[id] — удалить накладную (auth). Позиции уходят каскадом,
// связанный груз в трекере остаётся: его историю ведёт логист отдельно.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const denied = await requireAuth()
	if (denied) return denied

	const { id } = await params
	try {
		await prisma.waybill.delete({ where: { id } })
	} catch (e) {
		const known = prismaErrorResponse(e)
		if (known) return known
		throw e
	}
	return NextResponse.json({ success: true })
}
