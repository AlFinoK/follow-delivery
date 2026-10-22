import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { mapCargo } from '@/lib/mapCargo'
import { requireAuth } from '@/lib/auth'
import { badRequest, prismaErrorResponse, readJson } from '@/lib/apiUtil'
import { parseCargoInput } from '@/lib/cargoInput'

// GET /api/cargos/[id] — получить груз по docId (auth)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const denied = await requireAuth()
	if (denied) return denied

	const { id } = await params
	const cargo = await prisma.cargo.findUnique({ where: { id }, include: { folder: { select: { name: true } } } })
	if (!cargo) return NextResponse.json({ error: 'Not found' }, { status: 404 })
	return NextResponse.json(mapCargo(cargo))
}

// PATCH /api/cargos/[id] — обновить поля груза (auth)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const denied = await requireAuth()
	if (denied) return denied

	const { id } = await params
	const body = await readJson(req)
	if (!body) return badRequest('Некорректное тело запроса')

	const parsed = parseCargoInput(body, 'patch')
	if ('error' in parsed) return badRequest(parsed.error)
	const data: Prisma.CargoUncheckedUpdateInput = { ...parsed.data }

	if (body.folderId !== undefined) {
		if (body.folderId === null || body.folderId === '') data.folderId = null
		else if (typeof body.folderId !== 'string') return badRequest('Некорректная папка')
		else {
			// Несуществующая папка — ошибка клиента (400), а не FK-нарушение с 500.
			const folder = await prisma.folder.findUnique({ where: { id: body.folderId }, select: { id: true } })
			if (!folder) return badRequest('Папка не найдена')
			data.folderId = body.folderId
		}
	}

	if (Object.keys(data).length === 0) {
		return badRequest('Нет данных для обновления')
	}

	// Номер груза занят другим грузом → 409. Сам груз исключаем: PATCH с тем же номером — не конфликт.
	if (data.cargoNumber != null) {
		const clash = await prisma.cargo.findFirst({
			where: { cargoNumber: data.cargoNumber as number, NOT: { id } },
			select: { id: true },
		})
		if (clash) return NextResponse.json({ error: 'Номер уже занят' }, { status: 409 })
	}

	try {
		const cargo = await prisma.cargo.update({ where: { id }, data })
		return NextResponse.json(mapCargo(cargo))
	} catch (e) {
		// P2025 — груза с таким id нет → 404 (раньше 500)
		const mapped = prismaErrorResponse(e)
		if (mapped) return mapped
		throw e
	}
}

// DELETE /api/cargos/[id] — удалить груз (auth)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const denied = await requireAuth()
	if (denied) return denied

	const { id } = await params
	try {
		await prisma.cargo.delete({ where: { id } })
	} catch (e) {
		const mapped = prismaErrorResponse(e)
		if (mapped) return mapped
		throw e
	}
	return NextResponse.json({ success: true })
}
