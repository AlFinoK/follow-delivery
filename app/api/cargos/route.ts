import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { mapCargo, mapPublicCargo } from '@/lib/mapCargo'
import { getSession, requireAuth } from '@/lib/auth'
import { badRequest, clientIp, intParam, prismaErrorResponse, rateLimit, readJson, safeInt } from '@/lib/apiUtil'
import { parseCargoInput, parseTrackingId } from '@/lib/cargoInput'

const PAGE_SIZE = 20

// Публичный поиск: не больше 30 запросов в минуту с одного IP.
// ⚠️ Счётчик в памяти инстанса: на serverless (Vercel) у каждого инстанса свой и после
// холодного старта он обнуляется — это защита «по возможности», а не строгий лимит.
const TRACK_LIMIT = 30
const TRACK_WINDOW_MS = 60_000
const MAX_QUERY_LEN = 200

function statusFromFilter(key: string | null): string | null {
	if (key === 'waiting') return 'ожидает отправления'
	if (key === 'transit') return 'в пути'
	if (key === 'arrived') return 'прибыл'
	return null
}

// GET /api/cargos:
//   - ?trackingId=XYZ — публичный поиск по трек-номеру ИЛИ по cargoNumber (если ввод цифрами);
//     отдаёт урезанный публичный DTO (mapPublicCargo), с лимитом запросов по IP
//   - без trackingId — админский список с серверной пагинацией/фильтром, требует auth
//     поддерживает ?status=waiting|transit|arrived&q=...&page=N
//     возвращает { items, total, page, pageSize, counts }; page зажимается до последней страницы
export async function GET(req: NextRequest) {
	const trackingId = req.nextUrl.searchParams.get('trackingId')

	if (trackingId) {
		const limit = rateLimit(`track:${clientIp(req.headers)}`, TRACK_LIMIT, TRACK_WINDOW_MS)
		if (!limit.ok) {
			return NextResponse.json(
				{ error: 'Слишком много запросов. Попробуйте позже' },
				{ status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
			)
		}

		const notFound = () => NextResponse.json({ error: 'Груз не найден' }, { status: 404 })
		const raw = trackingId.trim()
		// NUL Postgres в тексте не принимает (ошибка → 500), а такого трек-номера быть не может.
		if (!raw || raw.length > MAX_QUERY_LEN || raw.includes('\u0000')) return notFound()

		// ⚠️ Только точное равенство. Раньше было `equals + mode: 'insensitive'`, а это ILIKE
		// без экранирования: `?trackingId=%` совпадал с любой строкой, `CARGO-300_` — с соседними.
		// Точное сравнение к тому же использует уникальный индекс trackingId.
		const upper = raw.toUpperCase()
		const byTracking: Prisma.CargoWhereInput[] = [{ trackingId: upper }]
		if (raw !== upper) byTracking.push({ trackingId: raw }) // трек-номера в смешанном регистре (унаследованные)

		// Цифры → ещё и номер груза. Число за пределами int32 в Int-колонку не кладём (раньше → 500).
		const asNumber = /^\d+$/.test(raw) ? safeInt(raw) : null
		const where: Prisma.CargoWhereInput = asNumber !== null ? { OR: [{ cargoNumber: asNumber }, ...byTracking] } : { OR: byTracking }

		// Если ищут по cargoNumber и есть несколько — берём самый свежий не-доставленный, иначе самый свежий.
		const cargo = await prisma.cargo.findFirst({
			where,
			orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
		})
		if (!cargo) return notFound()
		return NextResponse.json(mapPublicCargo(cargo))
	}

	const session = await getSession()
	if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

	const sp = req.nextUrl.searchParams
	const status = statusFromFilter(sp.get('status'))
	const q = (sp.get('q') ?? '').replace(/\u0000/g, '').trim().slice(0, MAX_QUERY_LEN)
	const requestedPage = intParam(sp.get('page'), 1)

	const where: Prisma.CargoWhereInput = {}
	if (status) where.status = status
	if (q) {
		const ors: Prisma.CargoWhereInput[] = [
			{ trackingId: { contains: q, mode: 'insensitive' } },
			{ name: { contains: q, mode: 'insensitive' } },
			{ fromCity: { contains: q, mode: 'insensitive' } },
			{ toCity: { contains: q, mode: 'insensitive' } },
			{ currentCity: { contains: q, mode: 'insensitive' } },
		]
		// В where число попадает только через safeInt: «99999999999» не лезет в Int (раньше → 500).
		const asNum = safeInt(q)
		if (asNum !== null) ors.push({ cargoNumber: asNum })
		where.OR = ors
	}

	const [total, groups] = await Promise.all([
		prisma.cargo.count({ where }),
		prisma.cargo.groupBy({ by: ['status'], _count: { _all: true } }),
	])
	// Страница за пределами диапазона (удалили последний груз на странице) → последняя существующая.
	const page = Math.min(requestedPage, Math.max(1, Math.ceil(total / PAGE_SIZE)))

	const items = await prisma.cargo.findMany({
		where,
		// название папки показываем в списке и в поиске (по просьбе заказчика)
		include: { folder: { select: { name: true } } },
		orderBy: { createdAt: 'desc' },
		skip: (page - 1) * PAGE_SIZE,
		take: PAGE_SIZE,
	})

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
	const denied = await requireAuth()
	if (denied) return denied

	const body = await readJson(req)
	if (!body) return badRequest('Некорректное тело запроса')

	if (!body.id || !body.fromCity || !body.toCity || !body.currentCity || !body.status) {
		return badRequest('Заполните все обязательные поля')
	}

	const trackingId = parseTrackingId(body.id)
	if (typeof trackingId !== 'string') return badRequest(trackingId.error)

	const parsed = parseCargoInput(body, 'create')
	if ('error' in parsed) return badRequest(parsed.error)
	const { data } = parsed

	if (await prisma.cargo.findUnique({ where: { trackingId }, select: { id: true } })) {
		return NextResponse.json({ error: 'Груз с таким трек-номером уже существует' }, { status: 409 })
	}
	if (data.cargoNumber != null && (await prisma.cargo.findFirst({ where: { cargoNumber: data.cargoNumber as number }, select: { id: true } }))) {
		return NextResponse.json({ error: 'Номер уже занят' }, { status: 409 })
	}

	try {
		const cargo = await prisma.cargo.create({
			data: {
				// parseCargoInput(…, 'create') гарантирует обязательные поля и допустимые значения
				...(data as unknown as Omit<Prisma.CargoUncheckedCreateInput, 'trackingId'>),
				trackingId,
			},
		})
		return NextResponse.json(mapCargo(cargo), { status: 201 })
	} catch (e) {
		// P2002 на trackingId при гонке двух запросов
		const mapped = prismaErrorResponse(e)
		if (mapped) return mapped
		throw e
	}
}
