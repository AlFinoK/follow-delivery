import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fallbackToSms } from '@/lib/notify/send'

// POST /api/notify/webhook — события от WAHA (нужен только для статусов доставки).
//
// Роут НЕобязателен: канал уведомления выбирается синхронно (check-exists), поэтому
// без вебхука всё работает — в журнале просто не будет «доставлено / прочитано».
// Настраивается на стороне WAHA переменными окружения контейнера:
//   WHATSAPP_HOOK_URL=https://ваш-домен/api/notify/webhook
//   WHATSAPP_HOOK_EVENTS=message.ack
//   WHATSAPP_HOOK_HMAC_KEY=<тот же секрет, что WAHA_HOOK_HMAC_KEY у приложения>
//
// Роут публичный (WAHA ходит без сессии), поэтому закрыт одним из двух способов:
//   1) HMAC-подпись тела (X-Webhook-Hmac, sha512) — предпочтительно;
//   2) секрет в query-строке (?secret=…) — если HMAC на стороне WAHA не включён.
// Не настроено ни то, ни другое → 404, как будто роута нет: открытый вебхук позволил
// бы кому угодно менять статусы отправок и провоцировать досылку SMS.
//
// ack: -1 ERROR | 0 PENDING | 1 SERVER | 2 DEVICE | 3 READ | 4 PLAYED

const ACK_STATUS: Record<number, string> = { 1: 'sent', 2: 'delivered', 3: 'read', 4: 'read' }
/** Порядок статусов: вебхуки приходят без гарантии порядка, назад не откатываем. */
const RANK: Record<string, number> = { pending: 0, sent: 1, delivered: 2, read: 3 }

export async function POST(req: NextRequest) {
	const raw = await req.text()
	if (!authorized(req, raw)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

	const body = (() => {
		try {
			return JSON.parse(raw) as { event?: string; payload?: { id?: string; ack?: number; ackName?: string } }
		} catch {
			return null
		}
	})()

	// На любое событие отвечаем 200: иначе WAHA будет переотправлять пакет, а нам
	// интересен только message.ack.
	if (!body || body.event !== 'message.ack' || !body.payload?.id) return NextResponse.json({ ok: true })

	try {
		await handleAck(body.payload.id, body.payload.ack ?? Number.NaN)
	} catch (e) {
		console.error('[notify] вебхук: не удалось обработать ack', body.payload.id, e)
	}
	return NextResponse.json({ ok: true })
}

function authorized(req: NextRequest, raw: string): boolean {
	const hmacKey = process.env.WAHA_HOOK_HMAC_KEY?.trim()
	if (hmacKey) {
		const got = req.headers.get('x-webhook-hmac') ?? ''
		const want = createHmac('sha512', hmacKey).update(raw).digest('hex')
		// Сравнение постоянного времени: побайтовое сравнение подписи утекает информацию
		// о том, сколько символов угадано.
		const a = Buffer.from(got, 'utf8')
		const b = Buffer.from(want, 'utf8')
		return a.length === b.length && timingSafeEqual(a, b)
	}

	const secret = process.env.NOTIFY_WEBHOOK_SECRET?.trim()
	return !!secret && req.nextUrl.searchParams.get('secret') === secret
}

async function handleAck(messageId: string, ack: number) {
	const log = await findByProviderId(messageId)
	if (!log) return // не наше сообщение (например, входящее от клиента)

	// ERROR: сообщение приняли, но доставить не смогли. Единственный случай, когда из
	// вебхука имеет смысл досылать SMS — «нет WhatsApp» здесь уже не появится, это
	// выясняется до отправки через check-exists.
	if (ack === -1) {
		await prisma.notification.update({
			where: { id: log.id },
			data: { status: 'failed', error: 'ACK_ERROR: WhatsApp не смог доставить сообщение' },
		})
		if (log.channel === 'whatsapp') await fallbackToSms(log.id)
		return
	}

	const next = ACK_STATUS[ack]
	if (!next || (RANK[next] ?? 0) <= (RANK[log.status] ?? 0)) return
	await prisma.notification.update({ where: { id: log.id }, data: { status: next } })
}

/**
 * Поиск строки журнала по id сообщения. Точное совпадение — обычный путь; запасной
 * вариант нужен потому, что движки WAHA отдают id в разной форме (`true_чат_ХЭШ` у
 * WEBJS, короткий id у NOWEB), и ответ на отправку может отличаться от того, что
 * приходит в ack. Хвост после последнего «_» — сам хэш сообщения, он совпадает.
 */
async function findByProviderId(messageId: string) {
	const exact = await prisma.notification.findFirst({ where: { providerId: messageId } })
	if (exact) return exact
	const hash = messageId.split('_').pop()
	if (!hash || hash === messageId) return null
	return prisma.notification.findFirst({ where: { providerId: { endsWith: hash } }, orderBy: { createdAt: 'desc' } })
}
