import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/folders/[id]/cargos — добавить грузы в папку по cargoNumbers
// body: { numbers: number[] }
// Возвращает: { added, notFound, alreadyDelivered, alreadyInFolder, movedFromOtherFolder }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id: folderId } = await params
	const body = await req.json()
	const rawNumbers: unknown[] = Array.isArray(body.numbers) ? body.numbers : []
	const numbers = Array.from(
		new Set(
			rawNumbers
				.map((n) => Number(n))
				.filter((n) => Number.isInteger(n) && n > 0),
		),
	)

	if (numbers.length === 0) {
		return NextResponse.json({ error: 'Список номеров пуст' }, { status: 400 })
	}

	const folder = await prisma.folder.findUnique({ where: { id: folderId } })
	if (!folder) return NextResponse.json({ error: 'Папка не найдена' }, { status: 404 })

	// Находим все грузы по cargoNumber
	const cargos = await prisma.cargo.findMany({
		where: { cargoNumber: { in: numbers } },
		select: { id: true, cargoNumber: true, status: true, folderId: true },
	})

	const foundNumbers = new Set(cargos.map((c) => c.cargoNumber).filter((n): n is number => n != null))
	const notFound = numbers.filter((n) => !foundNumbers.has(n))

	const alreadyDelivered: number[] = []
	const alreadyInFolder: number[] = []
	const movedFromOtherFolder: number[] = []
	const toAttachIds: string[] = []
	const addedNumbers: number[] = []

	for (const c of cargos) {
		if (c.status === 'прибыл') {
			if (c.cargoNumber != null) alreadyDelivered.push(c.cargoNumber)
			continue
		}
		if (c.folderId === folderId) {
			if (c.cargoNumber != null) alreadyInFolder.push(c.cargoNumber)
			continue
		}
		if (c.folderId && c.cargoNumber != null) {
			movedFromOtherFolder.push(c.cargoNumber)
		}
		toAttachIds.push(c.id)
		if (c.cargoNumber != null) addedNumbers.push(c.cargoNumber)
	}

	if (toAttachIds.length > 0) {
		await prisma.cargo.updateMany({
			where: { id: { in: toAttachIds } },
			data: { folderId },
		})
	}

	return NextResponse.json({
		added: addedNumbers,
		notFound,
		alreadyDelivered,
		alreadyInFolder,
		movedFromOtherFolder,
	})
}

// PATCH /api/folders/[id]/cargos — массовое обновление currentCity/status для всех активных грузов в папке
// body: { currentCity?, status? }
// При status === 'прибыл' грузы автоматически открепляются от папки.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id: folderId } = await params
	const body = await req.json()

	const data: Record<string, unknown> = {}
	if (typeof body.currentCity === 'string' && body.currentCity.trim()) data.currentCity = body.currentCity.trim()
	if (typeof body.status === 'string' && body.status) data.status = body.status

	if (Object.keys(data).length === 0) {
		return NextResponse.json({ error: 'Нет данных для обновления' }, { status: 400 })
	}

	const folder = await prisma.folder.findUnique({ where: { id: folderId } })
	if (!folder) return NextResponse.json({ error: 'Папка не найдена' }, { status: 404 })

	const result = await prisma.cargo.updateMany({
		where: { folderId, status: { not: 'прибыл' } },
		data,
	})

	return NextResponse.json({ updated: result.count })
}
