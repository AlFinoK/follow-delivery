import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { badRequest, intParam, prismaErrorResponse, readJson, safeInt } from '@/lib/apiUtil'
import { lastNotifications, mapWaybill, parseStatus, waybillData, waybillErrors, waybillItems } from '@/lib/mapWaybill'
import { syncAndLink } from '@/lib/waybill/cargoSync'
import { reserveWaybillNumber } from '@/lib/waybill/number'
import { notifyAfterSave } from '@/lib/notify/auto'

const PAGE_SIZE = 12

// Сохранение накладной может потянуть за собой автоуведомление, а оно ждёт
// подтверждения доставки от WhatsApp (см. maxDuration в /api/notify). Само уведомление
// ограничено дедлайном 20 с (autoNotifyWithDeadline), так что ответ придёт раньше 30 с.
export const maxDuration = 30

/** Номера выше этого порога клиент не выдаёт: счётчик стартует с 3000 и растёт по одному. */
const NUMBER_CEIL = 1_000_000_000

/** Окно, в течение которого повторный POST с тем же номером и теми же людьми — «повтор». */
const RETRY_WINDOW_MS = 30 * 60 * 1000

/** Строка поиска: без ведущих «№»/«#» (так номер пишут в документах), не длиннее 100 символов. */
function cleanQuery(raw: string | null): string {
	return (raw ?? '').trim().replace(/^[№#\s]+/, '').trim().slice(0, 100)
}

// GET /api/waybills — список накладных для админки (auth).
// ?q=… — поиск по номеру (можно «№3000»), ФИО отправителя/получателя, телефону получателя
//        (по цифрам: «+7 961 …» найдёт «+7961…»), городам, характеру груза
// ?status=draft|active|delivered|cancelled, ?page=N
// ?cargoId=… — накладная конкретного груза (блок «Накладная» на карточке груза)
// Возвращает { items, total, page, pageSize, counts }. `page` — страница, которая
// реально отдана: запрос за пределами последней страницы прижимается к ней.
export async function GET(req: NextRequest) {
	const denied = await requireAuth()
	if (denied) return denied

	const sp = req.nextUrl.searchParams
	const q = cleanQuery(sp.get('q'))
	const status = sp.get('status')
	const cargoId = sp.get('cargoId')
	const requestedPage = intParam(sp.get('page'), 1)

	const where: Prisma.WaybillWhereInput = {}
	if (status && status !== 'all') where.status = status
	if (cargoId) where.cargoId = cargoId
	if (q) {
		const ors: Prisma.WaybillWhereInput[] = [
			{ senderFullName: { contains: q, mode: 'insensitive' } },
			{ receiverFullName: { contains: q, mode: 'insensitive' } },
			{ receiverPhone: { contains: q, mode: 'insensitive' } },
			{ senderCity: { contains: q, mode: 'insensitive' } },
			{ receiverCity: { contains: q, mode: 'insensitive' } },
			{ nature: { contains: q, mode: 'insensitive' } },
		]
		// Телефон ищем по цифрам, но только если запрос похож на телефон: иначе «ул. 15/9а»
		// превратилось бы в «159» и цеплялось за случайные номера.
		const digits = q.replace(/\D/g, '')
		if (/^[+\d\s()\-]+$/.test(q) && digits.length >= 3) ors.push({ receiverPhone: { contains: digits } })
		// safeInt: «99999999999» не влезает в Int и раньше давал 500.
		const asNum = /^\d+$/.test(q) ? safeInt(q) : null
		if (asNum !== null) ors.push({ number: asNum })
		where.OR = ors
	}

	const [total, groups] = await Promise.all([
		prisma.waybill.count({ where }),
		prisma.waybill.groupBy({ by: ['status'], _count: { _all: true } }),
	])
	const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE))
	const page = Math.min(requestedPage, lastPage)

	const items = await prisma.waybill.findMany({
		where,
		include: { items: true },
		orderBy: { createdAt: 'desc' },
		skip: (page - 1) * PAGE_SIZE,
		take: PAGE_SIZE,
	})

	const counts = { all: 0, draft: 0, active: 0, delivered: 0, cancelled: 0 }
	for (const g of groups) {
		counts.all += g._count._all
		if (g.status in counts) counts[g.status as keyof typeof counts] = g._count._all
	}

	// Уведомлён ли клиент — последняя строка журнала по каждой накладной страницы, одним запросом.
	const notes = await lastNotifications(prisma, items.map((w) => w.id))
	const dtos = items.map((w) => ({ ...mapWaybill(w), lastNotification: notes.get(w.id) ?? null }))

	return NextResponse.json({ items: dtos, total, page, pageSize: PAGE_SIZE, counts })
}

// POST /api/waybills — создать накладную (auth). Номер берём из тела (его резервирует
// клиент при открытии формы через POST /api/waybills/number); если номера нет или он
// уже занят — выдаём новый и повторяем, чтобы сохранение не падало на UNIQUE.
//
// Тело может содержать `cargoId` — docId существующего груза: накладная оформляется
// ПОД этот груз (вместо нового CARGO-<номер>). Груз должен существовать и не быть
// привязан к другой накладной, иначе 400.
//
// ⚠️ ПОВТОР СОХРАНЕНИЯ. Номер клиент резервирует при открытии формы и шлёт его с каждой
// попыткой. Если первый POST прошёл, а ответ потерялся, «Сохранить» отправляет ТОТ ЖЕ
// номер — раньше это давало P2002, цикл ниже брал новый номер и создавал вторую накладную,
// второй груз и второе сообщение клиенту. Теперь, если накладная с таким номером уже есть
// и это явно то же оформление (тот же телефон получателя, те же ФИО, создана недавно),
// возвращаем её (200, не 201) и клиента повторно НЕ уведомляем. Если накладная с этим
// номером другая (номер выдали до восстановления базы) — старое поведение: новый номер.
export async function POST(req: NextRequest) {
	const denied = await requireAuth()
	if (denied) return denied

	const body = await readJson(req)
	if (!body) return badRequest('Некорректное тело запроса')
	if (body.status !== undefined && !parseStatus(body.status)) return badRequest('Некорректный статус накладной')

	const data = waybillData(body)
	const error = waybillErrors(data)
	if (error) return badRequest(error)

	const items = waybillItems(body)

	const supplied = safeInt(body.number)
	const suppliedNumber = supplied !== null && supplied < NUMBER_CEIL ? supplied : null

	// Повтор уже сохранённого оформления — до любых проверок cargoId: груз к этому
	// моменту уже привязан к той самой накладной и выглядел бы «занятым».
	if (suppliedNumber !== null) {
		const retry = await findRetry(suppliedNumber, data)
		if (retry) return retryResponse(retry, data)
	}

	const requestedCargoId = typeof body.cargoId === 'string' && body.cargoId.trim() ? body.cargoId.trim() : null
	if (requestedCargoId) {
		const cargo = await prisma.cargo.findUnique({ where: { id: requestedCargoId }, select: { id: true, waybill: { select: { id: true } } } })
		if (!cargo) return badRequest('Груз не найден — возможно, его удалили')
		if (cargo.waybill) return badRequest('К этому грузу уже привязана другая накладная')
	}

	let number = suppliedNumber ?? (await reserveWaybillNumber())

	// Сначала сама накладная: если номер всё же занят (например, его выдали до
	// восстановления базы), берём следующий и повторяем. Груз создаём ПОСЛЕ успеха,
	// иначе неудачная попытка оставила бы в трекере лишний CARGO-<номер>.
	let created = null
	for (let attempt = 0; attempt < 5 && !created; attempt++) {
		try {
			// cargoId пишем сразу, в той же вставке: уникальный индекс не даст двум
			// накладным занять один груз даже при гонке (проверка выше — лишь быстрый путь).
			created = await prisma.waybill.create({
				data: { ...data, number, cargoId: requestedCargoId, items: { create: items } },
				include: { items: true },
			})
		} catch (e) {
			const target = uniqueTarget(e)
			if (target === 'cargoId') return badRequest('К этому грузу уже привязана другая накладная')
			if (target !== 'number') {
				const known = prismaErrorResponse(e)
				if (known) return known
				throw e
			}
			// Конфликт по номеру. Если номер наш (клиентский) и под ним уже лежит это же
			// оформление — параллельный повтор: отдаём его.
			if (number === suppliedNumber) {
				const retry = await findRetry(number, data)
				if (retry) return retryResponse(retry, data)
			}
			number = await reserveWaybillNumber()
		}
	}
	if (!created) return NextResponse.json({ error: 'Не удалось присвоить номер накладной' }, { status: 409 })

	// Груз в трекере — производная сущность. Если привязка не удалась (например,
	// CARGO-<номер> уже занят другой накладной), накладную всё равно отдаём: связь
	// восстановится при следующем сохранении. Но клиента при этом НЕ зовём: в сообщении
	// ссылка на груз, которого нет.
	let result = mapWaybill(created)
	const synced = await syncAndLink(created, data)
	if (synced.ok) result = { ...result, cargoId: synced.cargoId }

	// Накладную создали сразу активной — клиента уведомляем автоматически.
	const notified = await notifyAfterSave(result, null, synced.ok)
	return NextResponse.json({ ...result, notified }, { status: 201 })
}

/** Поле, по которому сработал UNIQUE (`number` | `cargoId`), или null, если это не P2002. */
function uniqueTarget(e: unknown): 'number' | 'cargoId' | 'other' | null {
	const err = e as { code?: string; meta?: { target?: string[] | string } }
	if (err?.code !== 'P2002') return null
	const target = err.meta?.target
	const fields = Array.isArray(target) ? target.join(',') : String(target ?? '')
	if (fields.includes('cargoId')) return 'cargoId'
	if (fields.includes('number')) return 'number'
	return 'other'
}

type SubmittedData = ReturnType<typeof waybillData>

/**
 * Накладная с этим номером — повтор того же оформления? Да, если совпали телефон получателя
 * и ФИО обеих сторон и она создана не раньше RETRY_WINDOW_MS назад. Иначе null: это
 * чужая накладная, и номер надо менять.
 */
async function findRetry(number: number, data: SubmittedData) {
	const existing = await prisma.waybill.findUnique({ where: { number }, include: { items: true } })
	if (!existing) return null
	const same =
		existing.receiverPhone === data.receiverPhone &&
		existing.senderFullName === data.senderFullName &&
		existing.receiverFullName === data.receiverFullName &&
		Date.now() - existing.createdAt.getTime() < RETRY_WINDOW_MS
	return same ? existing : null
}

/** Ответ на повтор: текущее состояние накладной, груз «долечивается», уведомления нет. */
async function retryResponse(existing: NonNullable<Awaited<ReturnType<typeof findRetry>>>, data: SubmittedData) {
	let result = mapWaybill(existing)
	if (!existing.cargoId) {
		const synced = await syncAndLink(existing, data)
		if (synced.ok) result = { ...result, cargoId: synced.cargoId }
	}
	// Журнал уведомлений и защита от повтора (send.ts) уже отработали на первой попытке.
	return NextResponse.json(result, { status: 200 })
}
