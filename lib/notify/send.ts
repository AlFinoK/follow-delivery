// Отправка уведомления клиенту: WhatsApp основным каналом, SMS — фолбэком.
// Только сервер (пишет в БД и знает ключи провайдеров).
//
// Схема:
//   1. кнопка «Уведомить клиента» → POST /api/notify → notifyClient()
//   2. СНАЧАЛА спрашиваем WhatsApp, есть ли номер у получателя
//   3. нет → сразу SMS (в журнале две строки: неудачная whatsapp с кодом BAD_CONTACT
//      и следующая за ней sms с fallbackOf) — оператор видит, почему ушло SMS
//   4. есть → отправляем текст
//   5. пытаемся подтвердить доставку — см. оговорку ниже
//
// Почему проверка номера, а не «отправить и посмотреть, что вернётся»: она синхронная,
// поэтому решение о канале принимается ДО отправки и не зависит от того, настроен ли
// вебхук. (У Wazzup, с которого начинали, такой проверки нет — там SMS пришлось бы
// досылать асинхронно.)
//
// ⚠️ Успешный ответ на отправку означает «провайдер принял», а не «клиент получил»:
// WhatsApp отклоняет сообщение уже после него, например при ограничении аккаунта.
// Подтверждать доставку синхронно умеет только WAHA; у Green-API журнал сообщений
// отстаёт до двух минут, и статус приходит вебхуком. Поэтому рубежей три:
//   — синхронный confirmDelivery (там, где провайдер это умеет);
//   — вебхук /api/notify/webhook — досылает SMS, когда пришёл статус «не доставлено»;
//   — /api/notify/sweep — досылает SMS по таймауту, когда статуса нет ВООБЩЕ.
// Третий рубеж не запасной, а основной для РФ: у клиента с заблокированным WhatsApp
// сообщение, скорее всего, навсегда останется в статусе «отправлено».
//
// Если WhatsApp-канал не настроен, отправки не происходит и наружу отдаются ссылки
// wa.me / sms: — оператор отправляет вручную, кнопка не становится мёртвой.

import { prisma } from '@/lib/prisma'
import { mapWaybill, type WaybillRow } from '@/lib/mapWaybill'
import type { Waybill } from '@/lib/waybill/model'
import { buildClientMessage, buildClientMessages } from './message'
import { digits, smsLink, whatsappLink } from './links'
import { sendSms, smsConfigured, smsDeliveryStatus } from './sms'
import { checkNumberExists, confirmDelivery, sendWhatsApp, whatsappConfigured } from './whatsapp'
import {
	BAD_CONTACT,
	DELIVERY_FAILED,
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
 * Отправка SMS с подтверждением доставки.
 *
 * Успешный ответ шлюза — это «принял», а не «абонент получил». Телефон-шлюз отдаёт
 * сообщение оператору и рапортует `sent`; дальше оператор может его не доставить
 * (нулевой баланс SIM, антиспам), и статус так и застревает на `sent`. Поэтому
 * спрашиваем состояние: `failed` — честная ошибка, `delivered` — подтверждение,
 * всё остальное остаётся `sent` с пометкой «доставка не подтверждена».
 */
async function sendSmsConfirmed(
	logId: string,
	phone: string,
	text: string,
	confirm = true
): Promise<{ ok: boolean; delivered: boolean; code?: string; error?: string }> {
	const res = await sendSms(phone, text, logId)
	await finish(logId, res)
	if (!res.ok) return { ok: false, delivered: false, code: res.code, error: res.error }

	// confirm=false — отправка идёт из обхода /api/notify/sweep, где строк несколько и
	// ждать отчёта о доставке по каждой нельзя: статус уточнит следующий проход.
	const delivery = confirm ? await smsDeliveryStatus(res.providerId, phone) : undefined
	if (delivery === 'failed') {
		await finish(logId, { ok: false, providerId: res.providerId, code: DELIVERY_FAILED, error: 'Оператор не доставил SMS' })
		return { ok: false, delivered: false, code: DELIVERY_FAILED, error: 'Шлюз принял SMS, но оператор её не доставил' }
	}
	if (delivery === 'delivered') {
		await prisma.notification.update({ where: { id: logId }, data: { status: 'delivered' } })
		return { ok: true, delivered: true }
	}
	// Провайдер без проверки статуса или отчёт ещё не пришёл — не выдаём это за доставку.
	return { ok: true, delivered: false }
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
		whatsappAvailable: whatsappConfigured(),
		smsAvailable: smsConfigured(),
	}

	// Оператор явно выбрал SMS — не спрашиваем WhatsApp вообще.
	if (channel === 'sms') {
		if (!base.smsAvailable) return { ...base, channel: null, status: 'manual', code: NOT_CONFIGURED, error: 'SMS-шлюз не настроен' }
		const log = await createLog(w, 'sms', texts.sms)
		// id строки журнала уходит провайдеру как ключ идемпотентности.
		const res = await sendSmsConfirmed(log.id, phone, texts.sms)
		return res.ok
			? { ...base, channel: 'sms', status: 'sent', notificationId: log.id, pendingDelivery: !res.delivered }
			: { ...base, channel: null, status: 'failed', notificationId: log.id, code: res.code, error: res.error }
	}

	if (!base.whatsappAvailable) {
		return { ...base, channel: null, status: 'manual', code: NOT_CONFIGURED, error: 'WhatsApp-канал не настроен' }
	}

	// Защита от повторной отправки. Ключа идемпотентности нет ни у WAHA, ни у Green-API
	// (у Wazzup был crmMessageId), поэтому два клика = два сообщения. Плюс каждая отправка
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
		// Проверка не удалась (провайдер недоступен, сессия отвалилась) — это НЕ повод
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

	// Шаг 3 — подтверждение доставки, если провайдер умеет его синхронно.
	// chatId тот же, каким отправляли: у части номеров он приходит как @lid, а не @c.us,
	// и по неверному идентификатору история чата просто не найдётся.
	const ack = await confirmDelivery(chatId || `${digits(phone)}@c.us`, res.providerId)
	if (ack === -1) {
		await finish(log.id, { ok: false, providerId: res.providerId, code: DELIVERY_FAILED, error: 'WhatsApp не доставил сообщение' })
		return {
			...base,
			channel: null,
			status: 'failed',
			notificationId: log.id,
			code: DELIVERY_FAILED,
			error: 'WhatsApp принял сообщение, но не доставил его',
		}
	}

	// Доставка не подтверждена (undefined) — это норма для Green-API и для сообщения,
	// которое ещё в очереди. Помечаем pendingDelivery: статус уточнит вебхук, а если не
	// уточнит — SMS уйдёт по таймауту из /api/notify/sweep.
	return { ...base, channel: 'whatsapp', status: 'sent', notificationId: log.id, pendingDelivery: ack === undefined }
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
 *   3. WhatsApp принял, но НЕ
 *      доставил (ack = -1)          → SMS (notifyClient вернёт failed);
 *   4. SMS тоже не настроен         → ручной режим со ссылками.
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
	sourceId: string,
	opts?: { confirm?: boolean }
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

	const res = await sendSmsConfirmed(log.id, source.phone, text, opts?.confirm !== false)
	return { ok: res.ok, notificationId: log.id, code: res.code, error: res.error }
}

/** Короткий SMS-текст по накладной. null — накладной больше нет. */
async function smsTextFor(waybillId: string | null): Promise<string | null> {
	if (!waybillId) return null
	const row = await prisma.waybill.findUnique({ where: { id: waybillId }, include: { items: true } })
	if (!row) return null
	return buildClientMessage(mapWaybill(row as WaybillRow), 'sms')
}
