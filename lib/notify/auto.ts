// Автоматическое уведомление клиента при оформлении накладной.
// Только сервер: вызывается из роутов /api/waybills.
//
// Момент отправки — переход накладной в статус `active`, а не сам факт сохранения.
// Причина: новая накладная по умолчанию создаётся ЧЕРНОВИКОМ, и уведомлять клиента
// о грузе, реквизиты которого ещё правятся, рано. «Активна / В работе» — это как раз
// «накладная оформлена», после чего клиенту есть что сообщить.
//
// Правило одно и то же в обоих роутах:
//   POST  — накладная сразу создана активной;
//   PATCH — была неактивной, стала активной (обратный переход ничего не шлёт).
//
// Отправка НЕ должна ломать сохранение: накладная — источник истины, а уведомление
// вторично. Любая ошибка канала гасится и остаётся в журнале Notification.

import type { WaybillDTO } from '@/lib/mapWaybill'
import { notifyWithFallback } from './send'
import type { NotifyChannel } from './types'

/**
 * Телефон в E.164. Намеренно НЕ используем isPhoneValid из model.ts: тот тянет
 * react-phone-number-input, который ломает вычисление модуля на сервере (см. totals.ts).
 * Здесь достаточно грубой проверки — подробную клиент уже сделал перед сохранением.
 */
const looksLikePhone = (phone: string) => /^\+\d{10,15}$/.test(phone.trim())

/** Что произошло с автоуведомлением — уходит в ответ API, чтобы UI показал тост. */
export interface AutoNotifyResult {
	channel: NotifyChannel | null
	status: 'sent' | 'failed' | 'manual' | 'skipped'
	error?: string
}

/**
 * Отправить уведомление, если накладная только что стала активной.
 * `prevStatus` — статус до сохранения; для новой накладной передаётся null.
 */
export async function autoNotify(waybill: WaybillDTO, prevStatus: string | null): Promise<AutoNotifyResult | undefined> {
	const becameActive = waybill.status === 'active' && prevStatus !== 'active'
	if (!becameActive) return undefined

	// Без телефона отправлять некуда, а падать из-за этого сохранение не должно:
	// оператор мог оформить накладную, а телефон уточнить позже.
	if (!looksLikePhone(waybill.receiver.phone)) {
		return { channel: null, status: 'skipped', error: 'У получателя не указан корректный телефон' }
	}

	try {
		// Тот же каскад, что и у кнопки «Отправить»: WhatsApp → SMS.
		const outcome = await notifyWithFallback(waybill)
		if (outcome.status === 'sent') return { channel: outcome.channel, status: 'sent' }
		// «Ручной режим» осмыслен только для оператора: здесь нажимать ссылку некому.
		return { channel: null, status: outcome.status === 'manual' ? 'failed' : outcome.status, error: outcome.error }
	} catch (e) {
		console.error('[notify] автоуведомление не удалось:', e)
		return { channel: null, status: 'failed', error: e instanceof Error ? e.message : 'Не удалось отправить' }
	}
}
