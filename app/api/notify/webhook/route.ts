import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DELIVERY_FAILED } from '@/lib/notify/types'

// POST /api/notify/webhook — статусы доставки от Green-API.
//
// Формат: {"typeWebhook":"outgoingMessageStatus","idMessage":…,"status":"delivered"}.
// Настраивается методом SetSettings у инстанса: webhookUrl, webhookUrlToken,
// ⚠️ outgoingWebhook=yes — ИМЕННО он включает статусы (в кабинете «Receive webhooks on
// sent messages statuses»); без него статусов нет вообще — так и было с 19.09 по
// 22.10.2026, все уведомления считались недоставленными. outgoingAPIMessageWebhook —
// другое: уведомление о самом факте отправки через API, статусов не даёт.
// keepOnlineStatus=yes — иначе не приходит `delivered`. Токен приезжает в заголовке
// Authorization как `Bearer <токен>`.
//
// ⚠️ Вебхук — ЕДИНСТВЕННЫЙ источник статуса доставки: журнал сообщений Green-API отстаёт
// до двух минут, поэтому синхронно доставку не подтвердить. Но и на вебхук одного
// надеяться нельзя: у клиента с заблокированным WhatsApp сообщение остаётся в `sent` и
// события «не доставлено» не будет вовсе.
//
// Роут публичный (провайдер ходит без сессии), поэтому закрыт токеном
// GREENAPI_WEBHOOK_TOKEN. Токен не задан или не совпал → 404, как будто роута нет:
// открытый вебхук позволил бы кому угодно менять статусы отправок.

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
	if (!authorized(req)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

	const raw = await req.text()
	const body = (() => {
		try {
			return JSON.parse(raw) as { typeWebhook?: string; idMessage?: string; status?: string }
		} catch {
			return null
		}
	})()

	// На любое событие отвечаем 200: иначе Green-API будет переотправлять пакет (раз в
	// минуту в течение суток), а нам интересны только статусы.
	if (!body) return NextResponse.json({ ok: true })

	try {
		if (body.typeWebhook === 'outgoingMessageStatus' && body.idMessage && body.status) {
			await handleStatus(body.idMessage, mapStatus(body.status))
		}
	} catch (e) {
		console.error('[notify] вебхук: не удалось обработать статус', body.idMessage, e)
	}
	return NextResponse.json({ ok: true })
}

/** null — статус нам ничего не говорит (промежуточный или неизвестный). */
function mapStatus(status: string): string | null {
	const s = status.trim().toLowerCase()
	if (GREENAPI_FAILED.has(s)) return 'failed'
	return GREENAPI_STATUS[s] ?? null
}

/** Authorization: Bearer <webhookUrlToken>. */
function authorized(req: NextRequest): boolean {
	const token = process.env.GREENAPI_WEBHOOK_TOKEN?.trim()
	return !!token && equals(req.headers.get('authorization') ?? '', `Bearer ${token}`)
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
	// idMessage вебхука совпадает с тем, что вернул sendMessage (см. greenapi.ts).
	const log = await prisma.notification.findFirst({ where: { providerId: messageId } })
	if (!log) return // не наше сообщение (например, отправленное с телефона вручную)

	// Сообщение приняли, но доставить не смогли — фиксируем в журнале, оператор увидит
	// это в окне уведомления. Уже доставленное/прочитанное назад не откатываем.
	if (next === 'failed') {
		if (log.status === 'failed' || (RANK[log.status] ?? 0) >= RANK.delivered) return
		await prisma.notification.update({
			where: { id: log.id },
			data: { status: 'failed', error: `${DELIVERY_FAILED}: WhatsApp не доставил сообщение` },
		})
		return
	}

	if ((RANK[next] ?? 0) <= (RANK[log.status] ?? 0)) return
	// Причину ошибки снимаем: статус мог подняться из `failed`, когда подтверждение
	// пришло позже. Иначе в журнале осталась бы строка «доставлено» с текстом
	// «не доставлено».
	await prisma.notification.update({ where: { id: log.id }, data: { status: next, error: null } })
}
