import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { mapWaybill, type WaybillRow } from '@/lib/mapWaybill'
import { mapNotification, notifyClient, notifyWithFallback } from '@/lib/notify/send'
import { smsConfigured } from '@/lib/notify/sms'
import { wahaConfigured } from '@/lib/notify/waha'
import type { NotifyChannel, NotifyTexts } from '@/lib/notify/types'

// Отправка идёт синхронно и складывается из трёх обращений к WAHA: проверка номера,
// сама отправка (в логах доходило до 3 с) и подтверждение доставки по ack (~5,5 с).
// Дефолтные 10 с на Vercel в это не укладываются, а обрыв по таймауту оставил бы
// уведомление в статусе pending без ответа оператору.
export const maxDuration = 30

// GET /api/notify?waybillId=… — журнал отправок по накладной + доступность каналов (auth).
// Модалка запрашивает это при открытии: по флагам она решает, рисовать кнопку
// «Отправить» (авто) или «Открыть WhatsApp» (ручной режим). Сами ключи, разумеется,
// наружу не отдаются — только факт «настроено / нет».
export async function GET(req: NextRequest) {
	const session = await getServerSession()
	if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

	const waybillId = req.nextUrl.searchParams.get('waybillId')
	if (!waybillId) return NextResponse.json({ error: 'Не указана накладная' }, { status: 400 })

	const items = await prisma.notification.findMany({
		where: { waybillId },
		orderBy: { createdAt: 'desc' },
		take: 10,
	})
	return NextResponse.json({
		items: items.map(mapNotification),
		whatsappAvailable: wahaConfigured(),
		smsAvailable: smsConfigured(),
	})
}

// POST /api/notify — отправить уведомление клиенту (auth).
// Тело: { waybillId, channel?, text?, smsText? }. channel задаётся, только когда
// оператор ЯВНО выбрал SMS (например, уже знает, что WhatsApp у клиента нет);
// по умолчанию — WhatsApp с SMS-фолбэком.
//
// `text`/`smsText` — правки оператора к шаблону. Шаблон собирается на сервере из
// накладной и остаётся значением по умолчанию: пустая правка игнорируется, поэтому
// отправить клиенту пустое сообщение нельзя. Длина ограничена — не столько от
// злого умысла (роут под сессией админа), сколько чтобы случайная вставка мегабайта
// текста не ушла в WhatsApp и не легла в журнал.
const MAX_WHATSAPP = 4096
const MAX_SMS = 1000

export async function POST(req: NextRequest) {
	const session = await getServerSession()
	if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

	const body = (await req.json().catch(() => ({}))) as {
		waybillId?: unknown
		channel?: unknown
		text?: unknown
		smsText?: unknown
	}
	const waybillId = typeof body.waybillId === 'string' ? body.waybillId.trim() : ''
	if (!waybillId) return NextResponse.json({ error: 'Сначала сохраните накладную' }, { status: 400 })

	const channel: NotifyChannel | undefined = body.channel === 'sms' ? 'sms' : body.channel === 'whatsapp' ? 'whatsapp' : undefined
	const custom: NotifyTexts = {
		whatsapp: clip(body.text, MAX_WHATSAPP),
		sms: clip(body.smsText, MAX_SMS),
	}

	const row = await prisma.waybill.findUnique({ where: { id: waybillId }, include: { items: true } })
	if (!row) return NextResponse.json({ error: 'Накладная не найдена' }, { status: 404 })

	const waybill = mapWaybill(row as WaybillRow)
	if (!waybill.receiver.phone) return NextResponse.json({ error: 'У получателя не указан телефон' }, { status: 400 })

	try {
		// Без явного канала — каскад «WhatsApp, не вышло → SMS» (кнопка «Отправить»).
		// С каналом 'sms' — оператор выбрал SMS принудительно, WhatsApp не трогаем.
		const outcome = channel ? await notifyClient(waybill, channel, custom) : await notifyWithFallback(waybill, custom)
		return NextResponse.json(outcome)
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
