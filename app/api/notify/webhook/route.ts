import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fallbackToSms } from '@/lib/notify/send'

// POST /api/notify/webhook — статусы доставки от провайдера WhatsApp.
//
// Принимает два формата, потому что провайдера два (см. whatsapp.ts):
//
//   Green-API — {"typeWebhook":"outgoingMessageStatus","idMessage":…,"status":"delivered"}
//     Настраивается методом SetSettings у инстанса: webhookUrl, webhookUrlToken,
//     outgoingAPIMessageWebhook=yes (иначе статусы НАШИХ отправок не придут) и
//     keepOnlineStatus=yes (иначе не приходит `delivered`). Токен приезжает в заголовке
//     Authorization как `Bearer <токен>`.
//
//   WAHA — {"event":"message.ack","payload":{"id":…,"ack":-1}}
//     Настраивается переменными контейнера WHATSAPP_HOOK_URL / WHATSAPP_HOOK_EVENTS /
//     WHATSAPP_HOOK_HMAC_KEY. Подпись тела приезжает в X-Webhook-Hmac.
//
// ⚠️ Для Green-API вебхук — ОСНОВНОЙ источник статуса: их журнал сообщений отстаёт до
// двух минут, поэтому синхронно доставку не подтвердить. Но и на вебхук одного надеяться
// нельзя: у клиента с заблокированным WhatsApp сообщение остаётся в `sent` и события
// «не доставлено» не будет вовсе — этот случай закрывает /api/notify/sweep по таймауту.
//
// Роут публичный (провайдер ходит без сессии), поэтому закрыт одним из трёх способов:
// токен Green-API, HMAC-подпись WAHA или секрет в query (?secret=…). Не настроено
// ничего → 404, как будто роута нет: открытый вебхук позволил бы кому угодно менять
// статусы отправок и провоцировать досылку SMS.

/** WAHA: ack -1 ERROR | 0 PENDING | 1 SERVER | 2 DEVICE | 3 READ | 4 PLAYED */
const ACK_STATUS: Record<number, string> = { 1: 'sent', 2: 'delivered', 3: 'read', 4: 'read' }

/** Green-API: статусы исходящего сообщения. */
const GREENAPI_STATUS: Record<string, string> = { sent: 'sent', delivered: 'delivered', read: 'read' }
/**
 * Статусы Green-API, означающие, что сообщение НЕ доехало:
 *   failed     — ошибка при передаче на серверы WhatsApp
 *   noAccount  — у номера нет WhatsApp
 *   notInGroup — отправитель не состоит в группе
 *   suspended  — аккаунт временно ограничен (прежнее имя — yellowCard)
 */
const GREENAPI_FAILED = new Set(['failed', 'noaccount', 'notingroup', 'suspended', 'yellowcard'])

/** Порядок статусов: вебхуки приходят без гарантии порядка, назад не откатываем. */
const RANK: Record<string, number> = { pending: 0, sent: 1, delivered: 2, read: 3 }

export async function POST(req: NextRequest) {
	const raw = await req.text()
	if (!authorized(req, raw)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

	const body = (() => {
		try {
			return JSON.parse(raw) as {
				typeWebhook?: string
				idMessage?: string
				status?: string
				event?: string
				payload?: { id?: string; ack?: number }
			}
		} catch {
			return null
		}
	})()

	// На любое событие отвечаем 200: иначе провайдер будет переотправлять пакет (у
	// Green-API — раз в минуту в течение суток), а нам интересны только статусы.
	if (!body) return NextResponse.json({ ok: true })

	try {
		if (body.typeWebhook === 'outgoingMessageStatus' && body.idMessage && body.status) {
			await handleStatus(body.idMessage, mapGreenApi(body.status))
		} else if (body.event === 'message.ack' && body.payload?.id) {
			await handleStatus(body.payload.id, mapAck(body.payload.ack ?? Number.NaN))
		}
	} catch (e) {
		console.error('[notify] вебхук: не удалось обработать статус', body.idMessage ?? body.payload?.id, e)
	}
	return NextResponse.json({ ok: true })
}

/** null — статус нам ничего не говорит (промежуточный или неизвестный). */
function mapGreenApi(status: string): string | null {
	const s = status.trim().toLowerCase()
	if (GREENAPI_FAILED.has(s)) return 'failed'
	return GREENAPI_STATUS[s] ?? null
}

function mapAck(ack: number): string | null {
	if (ack === -1) return 'failed'
	return ACK_STATUS[ack] ?? null
}

function authorized(req: NextRequest, raw: string): boolean {
	// Green-API: Authorization: Bearer <webhookUrlToken>.
	const bearer = process.env.GREENAPI_WEBHOOK_TOKEN?.trim()
	if (bearer && equals(req.headers.get('authorization') ?? '', `Bearer ${bearer}`)) return true

	// WAHA: подпись тела.
	const hmacKey = process.env.WAHA_HOOK_HMAC_KEY?.trim()
	if (hmacKey && equals(req.headers.get('x-webhook-hmac') ?? '', createHmac('sha512', hmacKey).update(raw).digest('hex'))) {
		return true
	}

	const secret = process.env.NOTIFY_WEBHOOK_SECRET?.trim()
	return !!secret && req.nextUrl.searchParams.get('secret') === secret
}

/**
 * Сравнение постоянного времени: побайтовое сравнение секрета утекает информацию о
 * том, сколько символов угадано.
 */
function equals(got: string, want: string): boolean {
	const a = Buffer.from(got, 'utf8')
	const b = Buffer.from(want, 'utf8')
	return a.length === b.length && timingSafeEqual(a, b)
}

async function handleStatus(messageId: string, next: string | null) {
	if (!next) return
	const log = await findByProviderId(messageId)
	if (!log) return // не наше сообщение (например, входящее от клиента)

	// Сообщение приняли, но доставить не смогли — единственный случай, когда из вебхука
	// имеет смысл досылать SMS.
	if (next === 'failed') {
		if (log.status === 'failed') return // повторный вебхук, SMS уже досылали
		await prisma.notification.update({
			where: { id: log.id },
			data: { status: 'failed', error: 'DELIVERY_FAILED: WhatsApp не доставил сообщение' },
		})
		if (log.channel === 'whatsapp') await fallbackToSms(log.id)
		return
	}

	if ((RANK[next] ?? 0) <= (RANK[log.status] ?? 0)) return
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
