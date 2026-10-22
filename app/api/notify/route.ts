import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { badRequest, readJson } from '@/lib/apiUtil'
import { mapWaybill, type WaybillRow } from '@/lib/mapWaybill'
import { looksLikePhone } from '@/lib/notify/links'
import { mapNotification, notifyClient } from '@/lib/notify/send'
import { whatsappConfigured } from '@/lib/notify/whatsapp'

// Отправка идёт синхронно, внутри запроса оператора. У запроса к провайдеру свой
// таймаут (8 с, lib/notify/http.ts), но вместе с транзакцией журнала и холодным стартом
// дефолтных 10 с Vercel впритык, а обрыв по таймауту оставил бы уведомление в статусе
// pending. Запас в 30 с держим тот же, что у сохранения накладной (автоуведомление).
export const maxDuration = 30

// GET /api/notify?waybillId=… — журнал отправок по накладной + настроен ли WhatsApp (auth).
// Модалка запрашивает это при открытии: по флагу она решает, рисовать кнопку
// «Отправить» (авто) или «Открыть WhatsApp» (ручной режим). Сами ключи, разумеется,
// наружу не отдаются — только факт «настроено / нет».
export async function GET(req: NextRequest) {
	const denied = await requireAuth()
	if (denied) return denied

	const waybillId = req.nextUrl.searchParams.get('waybillId')
	if (!waybillId) return badRequest('Не указана накладная')

	const items = await prisma.notification.findMany({
		where: { waybillId },
		orderBy: { createdAt: 'desc' },
		take: 10,
	})
	return NextResponse.json({
		items: items.map(mapNotification),
		whatsappAvailable: whatsappConfigured(),
	})
}

// POST /api/notify — отправить уведомление клиенту в WhatsApp (auth).
// Тело: { waybillId, text? }.
//
// `text` — правка оператора к шаблону. Шаблон собирается на сервере из накладной и
// остаётся значением по умолчанию: пустая правка игнорируется, поэтому отправить
// клиенту пустое сообщение нельзя. Длина ограничена — не столько от злого умысла
// (роут под сессией админа), сколько чтобы случайная вставка мегабайта текста не ушла
// в WhatsApp и не легла в журнал.
const MAX_TEXT = 4096

export async function POST(req: NextRequest) {
	const denied = await requireAuth()
	if (denied) return denied

	const body = await readJson(req)
	if (!body) return badRequest('Некорректное тело запроса')
	const waybillId = typeof body.waybillId === 'string' ? body.waybillId.trim() : ''
	if (!waybillId) return badRequest('Сначала сохраните накладную')

	const custom = clip(body.text, MAX_TEXT)

	const row = await prisma.waybill.findUnique({ where: { id: waybillId }, include: { items: true } })
	if (!row) return NextResponse.json({ error: 'Накладная не найдена' }, { status: 404 })

	const waybill = mapWaybill(row as WaybillRow)
	// Та же проверка, что у автоуведомления: мусор вместо номера не должен уходить
	// провайдеру (и тянуть за собой лишнее обращение к WhatsApp).
	if (!looksLikePhone(waybill.receiver.phone)) return badRequest('У получателя не указан корректный телефон')

	try {
		return NextResponse.json(await notifyClient(waybill, custom))
	} catch (e) {
		console.error('[notify] отправка не удалась:', e)
		return NextResponse.json({ error: e instanceof Error ? e.message : 'Не удалось отправить уведомление' }, { status: 500 })
	}
}

/** Строка из тела запроса, обрезанная по лимиту. Не строка или пусто → undefined. */
function clip(v: unknown, max: number): string | undefined {
	if (typeof v !== 'string') return undefined
	const s = v.trim()
	return s ? s.slice(0, max) : undefined
}
