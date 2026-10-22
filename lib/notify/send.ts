// Отправка уведомления клиенту в WhatsApp (Green-API). Только сервер (пишет в БД и знает
// ключи провайдера). SMS в проекте нет: если WhatsApp не сработал, оператор видит причину
// и связывается с клиентом сам.
//
// Схема:
//   1. кнопка «Уведомить клиента» → POST /api/notify → notifyClient()
//   2. проверка номера (у Green-API недостоверна и всегда отвечает «есть», см. greenapi.ts)
//   3. нет → строка журнала `failed` с кодом BAD_CONTACT, оператор видит причину
//   4. есть → отправляем текст, строка журнала → `sent`
//
// ⚠️ Успешный ответ на отправку означает «провайдер принял», а не «клиент получил»:
// WhatsApp отклоняет сообщение уже после него, например при ограничении аккаунта.
// Синхронно доставку не подтвердить: журнал сообщений Green-API отстаёт до двух минут, и
// статус приходит только вебхуком /api/notify/webhook. Если у клиента WhatsApp
// заблокирован (РФ), сообщение навсегда останется в статусе «отправлено» — события
// «не доставлено» не будет, и узнать об этом можно только от самого клиента.
//
// Если WhatsApp-канал не настроен, отправки не происходит и наружу отдаётся ссылка
// wa.me — оператор отправляет вручную, кнопка не становится мёртвой.

import { prisma } from '@/lib/prisma'
import type { Waybill } from '@/lib/waybill/model'
import { buildClientMessage } from './message'
import { whatsappLink } from './links'
import { checkNumberExists, sendWhatsApp, whatsappConfigured } from './whatsapp'
import {
	BAD_CONTACT,
	NOT_CONFIGURED,
	RECENTLY_SENT,
	TIMEOUT,
	type NotificationDTO,
	type NotifyOutcome,
} from './types'

/** Окно, в течение которого повторное уведомление по той же накладной отклоняется. */
const RESEND_GUARD_MS = 10 * 60 * 1000

/** Строка `pending` старше этого срока считается мёртвой: отправка заведомо не идёт. */
export const PENDING_STALE_MS = 2 * 60 * 1000

export function mapNotification(n: {
	id: string
	channel: string
	status: string
	phone: string
	error: string | null
	createdAt: Date
}): NotificationDTO {
	return {
		id: n.id,
		channel: n.channel,
		status: n.status,
		phone: n.phone,
		error: n.error,
		createdAt: n.createdAt.toISOString(),
	}
}

/** Записать результат попытки в журнал. */
async function finish(id: string, res: { ok: boolean; providerId?: string; code?: string; error?: string }) {
	await prisma.notification.update({
		where: { id },
		data: {
			status: res.ok ? 'sent' : 'failed',
			providerId: res.providerId ?? null,
			error: res.ok ? null : [res.code, res.error].filter(Boolean).join(': ').slice(0, 500),
		},
	})
}

/**
 * Отправить уведомление по накладной.
 *
 * `custom` — правка оператора к шаблону. Шаблон остаётся значением по умолчанию:
 * пустая правка игнорируется, поэтому отправить пустое сообщение нельзя.
 */
export async function notifyClient(w: Waybill, custom?: string): Promise<NotifyOutcome> {
	const phone = w.receiver.phone
	const text = custom?.trim() || buildClientMessage(w)
	const base: Pick<NotifyOutcome, 'text' | 'link' | 'whatsappAvailable'> = {
		text,
		link: whatsappLink(phone, text),
		whatsappAvailable: whatsappConfigured(),
	}

	if (!base.whatsappAvailable) {
		return { ...base, status: 'manual', code: NOT_CONFIGURED, error: 'WhatsApp-канал не настроен' }
	}

	// Защита от повторной отправки. Ключа идемпотентности у Green-API нет,
	// поэтому два клика = два сообщения. Плюс каждая отправка тянет за собой обращение к
	// WhatsApp, а лишние обращения — прямой путь к тому, что аккаунт уедет «на проверку».
	//
	// Проверка и создание строки журнала — ОДНА транзакция под advisory-замком по накладной:
	// «проверил, что нет → создал» без замка не атомарно, два одновременных запроса оба
	// видели чисто и оба отправляли. Замок снимается сам при коммите; сама отправка идёт
	// уже ПОСЛЕ транзакции (держать замок на время запроса к WhatsApp незачем), а второй
	// запрос увидит строку `pending` и отклонится.
	const claim = await prisma.$transaction(async (tx) => {
		await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${w.docId ?? ''}))`

		const now = Date.now()
		// Зависшие `pending` (функцию оборвали, не дописав журнал) честно закрываем:
		// иначе строка висела бы в журнале вечно, а оператор видел бы «отправляется».
		await tx.notification.updateMany({
			where: { waybillId: w.docId, status: 'pending', createdAt: { lt: new Date(now - PENDING_STALE_MS) } },
			data: { status: 'failed', error: `${TIMEOUT}: отправка не завершилась` },
		})

		const recent = await tx.notification.findFirst({
			where: {
				waybillId: w.docId,
				OR: [
					{ status: { in: ['sent', 'delivered', 'read'] }, createdAt: { gte: new Date(now - RESEND_GUARD_MS) } },
					// Отправка в полёте: строка `pending` живёт секунды, и без неё окно
					// между созданием строки и ответом провайдера было незащищённым.
					{ status: 'pending', createdAt: { gte: new Date(now - PENDING_STALE_MS) } },
				],
			},
			orderBy: { createdAt: 'desc' },
		})
		if (recent) return { recent }

		const log = await tx.notification.create({
			data: {
				waybillId: w.docId,
				waybillNumber: w.number,
				phone,
				text,
				channel: 'whatsapp',
				status: 'pending',
			},
		})
		return { log }
	})

	if (claim.recent) {
		const recent = claim.recent
		if (recent.status === 'pending') {
			return {
				...base,
				status: 'failed',
				notificationId: recent.id,
				code: RECENTLY_SENT,
				error: 'Уведомление по этой накладной уже отправляется. Подождите несколько секунд.',
			}
		}
		const minutes = Math.max(1, Math.round((Date.now() - recent.createdAt.getTime()) / 60000))
		return {
			...base,
			status: 'failed',
			notificationId: recent.id,
			code: RECENTLY_SENT,
			error: `Уведомление уже отправлено ${minutes} мин. назад. Повторите позже, если это нужно.`,
		}
	}
	const log = claim.log

	// Шаг 1 — есть ли у номера WhatsApp.
	try {
		const check = await checkNumberExists()
		if (!check.exists) {
			const error = 'У номера нет WhatsApp'
			await finish(log.id, { ok: false, code: BAD_CONTACT, error })
			return { ...base, status: 'failed', notificationId: log.id, code: BAD_CONTACT, error }
		}
	} catch (e) {
		// Проверка не удалась (провайдер недоступен) — это НЕ повод считать, что WhatsApp
		// у клиента нет.
		const code = e instanceof Error && 'code' in e ? String((e as { code: unknown }).code) : 'CHECK_FAILED'
		const error = e instanceof Error ? e.message : 'Не удалось проверить номер в WhatsApp'
		await finish(log.id, { ok: false, code, error })
		return { ...base, status: 'failed', notificationId: log.id, code, error }
	}

	// Шаг 2 — отправка.
	const res = await sendWhatsApp(phone, text)
	await finish(log.id, res)
	if (!res.ok) return { ...base, status: 'failed', notificationId: log.id, code: res.code, error: res.error }

	// Провайдер принял сообщение, но доставка не подтверждена — синхронно её не узнать
	// (см. шапку). Помечаем pendingDelivery: статус уточнит вебхук.
	return { ...base, status: 'sent', notificationId: log.id, pendingDelivery: true }
}
