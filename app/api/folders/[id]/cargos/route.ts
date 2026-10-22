import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { badRequest, readJson, safeInt } from '@/lib/apiUtil'
import { CARGO_STATUSES, isCargoStatus } from '@/lib/cargoInput'

const MAX_NUMBERS = 1000

/** Номер груза из ввода оператора: число или строка, допускается «№3001», «№ 3001», « 3001 ». */
function parseNumber(v: unknown): number | null {
	if (typeof v === 'string') return safeInt(v.replace(/^[\s№#]+/, '').trim())
	return safeInt(v)
}

// POST /api/folders/[id]/cargos — добавить грузы в папку по cargoNumbers
// body: { numbers: (number | string)[] }
// Возвращает: { added, notFound, alreadyDelivered, alreadyInFolder, movedFromOtherFolder }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const denied = await requireAuth()
	if (denied) return denied

	const { id: folderId } = await params
	const body = await readJson(req)
	if (!body) return badRequest('Некорректное тело запроса')
	const rawNumbers: unknown[] = Array.isArray(body.numbers) ? body.numbers : []
	if (rawNumbers.length > MAX_NUMBERS) return badRequest('Слишком много номеров за один раз')

	// В `where` попадают только числа, прошедшие safeInt (положительные, ≤ int32): раньше
	// Number('99999999999') уходил в Int-колонку и ронял запрос в 500.
	const numbers = Array.from(new Set(rawNumbers.map(parseNumber).filter((n): n is number => n !== null)))

	if (numbers.length === 0) {
		return badRequest('Список номеров пуст')
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
// Прибывшие грузы (status === 'прибыл') под массовое обновление НЕ попадают, но и от
// папки не открепляются: они уходят из вкладки «Активные» и из счётчика папки, а видны
// во вкладке «Доставлена» (см. GET /api/folders/[id]?tab=delivered).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const denied = await requireAuth()
	if (denied) return denied

	const { id: folderId } = await params
	const body = await readJson(req)
	if (!body) return badRequest('Некорректное тело запроса')

	const data: Record<string, unknown> = {}
	if (typeof body.currentCity === 'string' && body.currentCity.trim()) {
		const city = body.currentCity.trim()
		if (city.length > 300 || city.includes('\u0000')) return badRequest('Некорректный город')
		data.currentCity = city
	}
	// Статус — только из трёх допустимых: произвольная строка ломала фильтры и счётчики списка.
	if (body.status !== undefined && body.status !== null && body.status !== '') {
		if (!isCargoStatus(body.status)) return badRequest(`Недопустимый статус. Допустимо: ${CARGO_STATUSES.join(', ')}`)
		data.status = body.status
	}

	if (Object.keys(data).length === 0) {
		return badRequest('Нет данных для обновления')
	}

	const folder = await prisma.folder.findUnique({ where: { id: folderId } })
	if (!folder) return NextResponse.json({ error: 'Папка не найдена' }, { status: 404 })

	const result = await prisma.cargo.updateMany({
		where: { folderId, status: { not: 'прибыл' } },
		data,
	})

	return NextResponse.json({ updated: result.count })
}
