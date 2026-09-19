import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fallbackToSms } from '@/lib/notify/send'
import { smsDeliveryProbe } from '@/lib/notify/sms'

// POST /api/notify/sweep — досылка SMS по таймауту и уточнение статусов SMS.
//
// ⚠️ Зачем нужен отдельный обход. У клиента в РФ с заблокированным WhatsApp сообщение
// не становится «не доставлено» — оно навсегда остаётся в статусе «отправлено», события
// об ошибке не будет вовсе. Значит, вебхука недостаточно: решение «WhatsApp не сработал»
// должен принять таймаут. Без этого клиент просто не получит уведомление, а в журнале
// будет стоять «отправлено».
//
// Кто вызывает: cron НА VPS, раз в 5 минут. Vercel Cron не подходит — на тарифе Hobby
// он запускается раз в сутки, более частые выражения не проходят деплой. VPS никуда не
// делся: на нём живёт прод-база.
//
//   */5 * * * * curl -fsS -X POST -H "X-Sweep-Secret: $SECRET" https://<домен>/api/notify/sweep
//
// Роут публичный, поэтому закрыт секретом NOTIFY_SWEEP_SECRET. Не задан → 404, как
// будто роута нет: иначе кто угодно мог бы провоцировать досылку SMS.

export const maxDuration = 30

/** Сколько ждём подтверждения доставки WhatsApp, прежде чем дослать SMS. */
const timeoutMin = () => {
	const raw = Number(process.env.NOTIFY_WA_TIMEOUT_MIN)
	return Number.isFinite(raw) && raw > 0 ? raw : 15
}

/**
 * Старше суток не трогаем совсем. Во-первых, догонять клиента SMS про вчерашний груз
 * бессмысленно; во-вторых, SMSC хранит статусы только сутки, дальше сообщения уходят
 * в архив и статус всё равно не узнать.
 */
const STALE_MS = 24 * 60 * 60 * 1000

/** За проход берём немного: обход должен укладываться в лимит времени функции. */
const BATCH = 10

export async function POST(req: NextRequest) {
	const secret = process.env.NOTIFY_SWEEP_SECRET?.trim()
	if (!secret || !authorized(req, secret)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

	const now = Date.now()
	const notBefore = new Date(now - STALE_MS)

	const resent = await resendStuckWhatsapp(new Date(now - timeoutMin() * 60_000), notBefore)
	const statuses = await refreshSmsStatuses(notBefore)

	return NextResponse.json({ ok: true, ...resent, ...statuses })
}

function authorized(req: NextRequest, secret: string): boolean {
	const header = req.headers.get('x-sweep-secret') ?? req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? ''
	const a = Buffer.from(header, 'utf8')
	const b = Buffer.from(secret, 'utf8')
	return a.length === b.length && timingSafeEqual(a, b)
}

/**
 * WhatsApp-уведомления, по которым за таймаут не пришло подтверждение доставки.
 *
 * Помечаем строку неудачной и досылаем SMS. Повторной отправки не будет: fallbackToSms
 * проверяет наличие строки с `fallbackOf`. Если вебхук с «доставлено» придёт позже,
 * он поднимет статус обратно — это нормально, клиент к тому моменту уже уведомлён.
 */
async function resendStuckWhatsapp(olderThan: Date, notBefore: Date) {
	const stuck = await prisma.notification.findMany({
		where: {
			channel: 'whatsapp',
			status: { in: ['pending', 'sent'] },
			createdAt: { lt: olderThan, gte: notBefore },
		},
		orderBy: { createdAt: 'asc' },
		take: BATCH,
	})

	let resent = 0
	for (const row of stuck) {
		try {
			await prisma.notification.update({
				where: { id: row.id },
				data: { status: 'failed', error: `DELIVERY_TIMEOUT: доставка не подтверждена за ${timeoutMin()} мин.` },
			})
			// confirm: false — отчёт о доставке по этой SMS уточнит следующий проход,
			// ждать его здесь по каждой строке нельзя.
			const fb = await fallbackToSms(row.id, { confirm: false })
			if (fb?.ok) resent++
		} catch (e) {
			console.error('[notify] sweep: не удалось дослать SMS по', row.id, e)
		}
	}
	return { checkedWhatsapp: stuck.length, resent }
}

/** Уточнение статусов SMS, по которым отчёт о доставке ещё не приходил. */
async function refreshSmsStatuses(notBefore: Date) {
	const pending = await prisma.notification.findMany({
		where: { channel: 'sms', status: 'sent', providerId: { not: null }, createdAt: { gte: notBefore } },
		orderBy: { createdAt: 'asc' },
		take: BATCH,
	})

	let delivered = 0
	let failed = 0
	for (const row of pending) {
		try {
			const status = await smsDeliveryProbe(row.providerId ?? undefined, row.phone)
			if (status === 'delivered') {
				await prisma.notification.update({ where: { id: row.id }, data: { status: 'delivered' } })
				delivered++
			} else if (status === 'failed') {
				await prisma.notification.update({
					where: { id: row.id },
					data: { status: 'failed', error: 'DELIVERY_FAILED: оператор не доставил SMS' },
				})
				failed++
			}
		} catch (e) {
			console.error('[notify] sweep: не удалось уточнить статус SMS', row.id, e)
		}
	}
	return { checkedSms: pending.length, delivered, failed }
}
