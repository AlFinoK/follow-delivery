// Отправка уведомления клиенту: WhatsApp основным каналом, SMS — фолбэком.
// Только сервер (пишет в БД и знает ключи провайдеров).
//
// Схема (WAHA):
//   1. кнопка «Уведомить клиента» → POST /api/notify → notifyClient()
//   2. СНАЧАЛА спрашиваем WhatsApp, есть ли номер: GET /api/contacts/check-exists
//   3. нет → сразу SMS (в журнале две строки: неудачная whatsapp с кодом BAD_CONTACT
//      и следующая за ней sms с fallbackOf) — оператор видит, почему ушло SMS
//   4. есть → отправляем текст; статус в журнале уточняет вебхук message.ack
//
// Почему проверка, а не «отправить и посмотреть, что вернётся»: у WAHA проверка
// синхронная, поэтому решение о канале принимается ДО отправки и не зависит от того,
// настроен ли вебхук. (У Wazzup, с которого начинали, такой проверки нет — там SMS
// пришлось бы досылать асинхронно.) Вебхук остаётся страховкой: ack=ERROR означает,
// что принятое сообщение всё же не доехало, и тогда SMS уходит из вебхука.
//
// Если WAHA не настроена, отправки не происходит и наружу отдаются ссылки
// wa.me / sms: — оператор отправляет вручную, кнопка не становится мёртвой.

import { prisma } from '@/lib/prisma'
import { mapWaybill, type WaybillRow } from '@/lib/mapWaybill'
import type { Waybill } from '@/lib/waybill/model'
import { buildClientMessage, buildClientMessages } from './message'
import { smsLink, whatsappLink } from './links'
import { sendSms, smsConfigured } from './sms'
import { checkNumberExists, sendWhatsApp, wahaConfigured } from './waha'
import {
	BAD_CONTACT,
	NOT_CONFIGURED,
	RECENTLY_SENT,
	type NotificationDTO,
	type NotifyChannel,
	type NotifyOutcome,
	type NotifyTexts,
} from './types'

/** Окно, в течение которого повторное уведомление по той же накладной отклоняется. */
const RESEND_GUARD_MS = 10 * 60 * 1000

/** Шаблон + правки оператора. Пустая правка = оставить шаблон. */
function withCustom(base: Record<NotifyChannel, string>, custom?: NotifyTexts): Record<NotifyChannel, string> {
	return {
		whatsapp: custom?.whatsapp?.trim() || base.whatsapp,
		sms: custom?.sms?.trim() || base.sms,
	}
}

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
 * `channel` — принудительный выбор канала.
 * `custom` — правки оператора к шаблону (см. NotifyTexts). Шаблон остаётся значением
 * по умолчанию: пустая правка игнорируется, поэтому отправить пустое сообщение нельзя.
 */
export async function notifyClient(w: Waybill, channel?: NotifyChannel, custom?: NotifyTexts): Promise<NotifyOutcome> {
	const phone = w.receiver.phone
	const texts = withCustom(buildClientMessages(w), custom)
	const base: Pick<NotifyOutcome, 'texts' | 'links' | 'whatsappAvailable' | 'smsAvailable'> = {
		texts,
		links: { whatsapp: whatsappLink(phone, texts.whatsapp), sms: smsLink(phone, texts.sms) },
		whatsappAvailable: wahaConfigured(),
		smsAvailable: smsConfigured(),
	}

	// Оператор явно выбрал SMS — не спрашиваем WhatsApp вообще.
	if (channel === 'sms') {
		if (!base.smsAvailable) return { ...base, channel: null, status: 'manual', code: NOT_CONFIGURED, error: 'SMS-шлюз не настроен' }
		const log = await createLog(w, 'sms', texts.sms)
		// id строки журнала уходит провайдеру как ключ идемпотентности.
		const res = await sendSms(phone, texts.sms, log.id)
		await finish(log.id, res)
		return res.ok
			? { ...base, channel: 'sms', status: 'sent', notificationId: log.id }
			: { ...base, channel: null, status: 'failed', notificationId: log.id, code: res.code, error: res.error }
	}

	if (!base.whatsappAvailable) {
		return { ...base, channel: null, status: 'manual', code: NOT_CONFIGURED, error: 'WAHA не настроена' }
	}

	// Защита от повторной отправки. У WAHA нет ключа идемпотентности (у Wazzup был
	// crmMessageId), поэтому два клика = два сообщения клиенту. Плюс каждая отправка
	// тянет за собой обращение к WhatsApp, а лишние обращения — прямой путь к тому,
	// что аккаунт снова уедет «на проверку».
	const recent = await prisma.notification.findFirst({
		where: {
			waybillId: w.docId,
			channel: 'whatsapp',
			status: { in: ['sent', 'delivered', 'read'] },
			createdAt: { gte: new Date(Date.now() - RESEND_GUARD_MS) },
		},
		orderBy: { createdAt: 'desc' },
	})
	if (recent) {
		const minutes = Math.max(1, Math.round((Date.now() - recent.createdAt.getTime()) / 60000))
		return {
			...base,
			channel: null,
			status: 'failed',
			notificationId: recent.id,
			code: RECENTLY_SENT,
			error: `Уведомление уже отправлено ${minutes} мин. назад. Повторите позже, если это нужно.`,
		}
	}

	// SMS-вариант кладём рядом сразу: если WhatsApp примет сообщение, но не доставит,
	// вебхук дошлёт именно этот текст — с правками оператора, а не шаблон.
	const log = await createLog(w, 'whatsapp', texts.whatsapp, texts.sms)

	// Шаг 1 — есть ли у номера WhatsApp.
	let chatId: string | undefined
	try {
		const check = await checkNumberExists(phone)
		if (!check.exists) {
			// Номера нет в WhatsApp: закрываем попытку и уходим в SMS. Ошибку пишем
			// кодом BAD_CONTACT — тем же, что приходит из вебхука, чтобы в журнале
			// причина выглядела одинаково независимо от того, где она выяснилась.
			await finish(log.id, { ok: false, code: BAD_CONTACT, error: 'У номера нет WhatsApp' })
			const fb = await fallbackToSms(log.id)
			return {
				...base,
				channel: fb?.ok ? 'sms' : null,
				status: fb?.ok ? 'sent' : 'failed',
				notificationId: fb?.notificationId ?? log.id,
				code: BAD_CONTACT,
				error: fb?.ok ? undefined : fb?.error,
			}
		}
		chatId = check.chatId
	} catch (e) {
		// Проверка не удалась (WAHA недоступна, сессия отвалилась) — это НЕ повод
		// считать, что WhatsApp у клиента нет, и уж точно не повод молча слать SMS.
		const code = e instanceof Error && 'code' in e ? String((e as { code: unknown }).code) : 'CHECK_FAILED'
		const error = e instanceof Error ? e.message : 'Не удалось проверить номер в WhatsApp'
		await finish(log.id, { ok: false, code, error })
		return { ...base, channel: null, status: 'failed', notificationId: log.id, code, error }
	}

	// Шаг 2 — отправка.
	const res = await sendWhatsApp(phone, texts.whatsapp, chatId)
	await finish(log.id, res)
	if (!res.ok) return { ...base, channel: null, status: 'failed', notificationId: log.id, code: res.code, error: res.error }

	return { ...base, channel: 'whatsapp', status: 'sent', notificationId: log.id, pendingDelivery: true }
}

function createLog(w: Waybill, channel: NotifyChannel, text: string, smsText?: string) {
	return prisma.notification.create({
		data: {
			waybillId: w.docId,
			waybillNumber: w.number,
			phone: w.receiver.phone,
			text,
			smsText: smsText ?? null,
			channel,
			status: 'pending',
		},
	})
}

/**
 * Отправка «одной кнопкой»: WhatsApp, а если он не сработал — SMS.
 *
 * Каскад целиком:
 *   1. у номера нет WhatsApp        → SMS (это делает сам notifyClient);
 *   2. WhatsApp-канал не настроен
 *      или недоступен (WAHA лежит,
 *      сессия отвалилась)           → SMS (это делает эта функция);
 *   3. SMS тоже не настроен         → ручной режим со ссылками.
 *
 * Повтор, отклонённый защитой от дублей (RECENTLY_SENT), в SMS НЕ уходит: клиенту
 * только что уже написали, второе сообщение другим каналом ему не нужно.
 */
export async function notifyWithFallback(w: Waybill, custom?: NotifyTexts): Promise<NotifyOutcome> {
	const outcome = await notifyClient(w, undefined, custom)
	if (outcome.status === 'sent' || outcome.code === RECENTLY_SENT) return outcome
	if (!outcome.smsAvailable) return outcome

	const viaSms = await notifyClient(w, 'sms', custom)
	// Причину провала WhatsApp сохраняем: оператору полезно знать, почему ушло SMS.
	return viaSms.status === 'sent' ? { ...viaSms, code: outcome.code ?? viaSms.code } : viaSms
}

/**
 * Досылка SMS вместо не доставленного WhatsApp. Вызывается двумя путями: сразу при
 * `numberExists: false` и из вебхука при ack=ERROR.
 *
 * Текст берётся из колонки `smsText` исходной строки — там лежит короткий вариант
 * ровно в том виде, какой видел оператор (включая его правки). Брать `text` нельзя:
 * это ПОЛНЫЙ WhatsApp-текст, он ушёл бы пятью SMS. Пересборка из накладной осталась
 * запасным путём — для строк, созданных до появления колонки.
 */
export async function fallbackToSms(
	sourceId: string
): Promise<{ ok: boolean; notificationId?: string; code?: string; error?: string } | null> {
	const source = await prisma.notification.findUnique({ where: { id: sourceId } })
	if (!source) return null

	// Защита от повторов: вебхук может прийти несколько раз (ack приходит на каждое
	// изменение статуса, и WAHA переотправляет вебхук при ошибке).
	const already = await prisma.notification.findFirst({ where: { fallbackOf: source.id } })
	if (already) return { ok: already.status === 'sent', notificationId: already.id }

	if (!smsConfigured()) {
		await prisma.notification.update({
			where: { id: source.id },
			data: { error: `${source.error ?? BAD_CONTACT}; SMS-фолбэк не настроен` },
		})
		return { ok: false, code: NOT_CONFIGURED, error: 'SMS-шлюз не настроен' }
	}

	const text = source.smsText?.trim() || (await smsTextFor(source.waybillId))
	if (!text) return { ok: false, code: 'WAYBILL_GONE', error: 'Накладная удалена — текст SMS не собрать' }

	const log = await prisma.notification.create({
		data: {
			waybillId: source.waybillId,
			waybillNumber: source.waybillNumber,
			phone: source.phone,
			text,
			channel: 'sms',
			status: 'pending',
			fallbackOf: source.id,
		},
	})

	const res = await sendSms(source.phone, text, log.id)
	await finish(log.id, res)
	return { ok: res.ok, notificationId: log.id, code: res.code, error: res.error }
}

/** Короткий SMS-текст по накладной. null — накладной больше нет. */
async function smsTextFor(waybillId: string | null): Promise<string | null> {
	if (!waybillId) return null
	const row = await prisma.waybill.findUnique({ where: { id: waybillId }, include: { items: true } })
	if (!row) return null
	return buildClientMessage(mapWaybill(row as WaybillRow), 'sms')
}
