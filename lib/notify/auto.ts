// Автоматическое уведомление клиента при оформлении накладной.
// Только сервер: вызывается из роутов /api/waybills.
//
// Момент отправки — ПЕРВЫЙ переход накладной в статус `active`, а не сам факт сохранения.
// Причина: новая накладная по умолчанию создаётся ЧЕРНОВИКОМ, и уведомлять клиента
// о грузе, реквизиты которого ещё правятся, рано. «Активна / В работе» — это как раз
// «накладная оформлена», после чего клиенту есть что сообщить.
//
// Правило одно и то же в обоих роутах:
//   POST  — накладная сразу создана активной (prevStatus = null);
//   PATCH — была черновиком, стала активной.
// Возврат в `active` из `delivered`/`cancelled` (оператор «оживил» накладную) клиенту
// НЕ пишет: он уже получил уведомление при первой активации, а повтор выглядел бы как спам
// и тянул бы лишнее обращение к WhatsApp.
//
// Отправка НЕ должна ломать сохранение: накладная — источник истины, а уведомление
// вторично. Любая ошибка канала гасится и остаётся в журнале Notification, а общий
// дедлайн (autoNotifyWithDeadline) гарантирует, что ответ на сохранение придёт раньше
// maxDuration, даже если провайдер завис.

import type { WaybillDTO } from '@/lib/mapWaybill'
import { looksLikePhone } from './links'
import { notifyClient } from './send'
import { BAD_PHONE, NO_CARGO, TIMEOUT } from './types'

/** Что произошло с автоуведомлением — уходит в ответ API, чтобы UI показал тост. */
export interface AutoNotifyResult {
	status: 'sent' | 'failed' | 'manual' | 'skipped'
	error?: string
	/**
	 * Машинный код причины (BAD_PHONE, NOT_CONFIGURED, BAD_CONTACT, RECENTLY_SENT,
	 * DELIVERY_FAILED, CHECK_FAILED, TIMEOUT, NO_CARGO, …): UI по нему подбирает
	 * переведённое сообщение, а `error` остаётся запасным русским текстом.
	 */
	code?: string
}

/** Первая активация: новая накладная или переход из черновика. */
export function isFirstActivation(status: string, prevStatus: string | null): boolean {
	return status === 'active' && (prevStatus === null || prevStatus === 'draft')
}

/**
 * Отправить уведомление, если накладная только что стала активной.
 * `prevStatus` — статус до сохранения; для новой накладной передаётся null.
 */
export async function autoNotify(waybill: WaybillDTO, prevStatus: string | null): Promise<AutoNotifyResult | undefined> {
	if (!isFirstActivation(waybill.status, prevStatus)) return undefined

	// Без телефона отправлять некуда, а падать из-за этого сохранение не должно:
	// оператор мог оформить накладную, а телефон уточнить позже.
	if (!looksLikePhone(waybill.receiver.phone)) {
		return { status: 'skipped', code: BAD_PHONE, error: 'У получателя не указан корректный телефон' }
	}

	try {
		const outcome = await notifyClient(waybill)
		if (outcome.status === 'sent') return { status: 'sent' }
		// «Ручной режим» осмыслен только для оператора: здесь нажимать ссылку некому.
		return { status: outcome.status === 'manual' ? 'failed' : outcome.status, code: outcome.code, error: outcome.error }
	} catch (e) {
		console.error('[notify] автоуведомление не удалось:', e)
		return { status: 'failed', code: 'SEND_ERROR', error: e instanceof Error ? e.message : 'Не удалось отправить' }
	}
}

/**
 * Автоуведомление после сохранения накладной.
 *
 * `cargoSynced = false` — груз в трекере не создан/не обновлён: в сообщении ссылка
 * отслеживания на груз, которого нет, поэтому клиенту не пишем, а оператору возвращаем
 * `skipped` с кодом NO_CARGO (после повторного сохранения уведомить можно вручную).
 */
export async function notifyAfterSave(
	waybill: WaybillDTO,
	prevStatus: string | null,
	cargoSynced: boolean,
	deadlineMs = AUTO_NOTIFY_DEADLINE_MS
): Promise<AutoNotifyResult | undefined> {
	if (!cargoSynced) {
		if (!isFirstActivation(waybill.status, prevStatus)) return undefined
		return {
			status: 'skipped',
			code: NO_CARGO,
			error: 'Накладная сохранена, но груз в трекере не создан — клиенту не написали. Сохраните накладную ещё раз.',
		}
	}
	return autoNotifyWithDeadline(waybill, prevStatus, deadlineMs)
}

/** Сколько ждём автоуведомление при сохранении накладной. */
export const AUTO_NOTIFY_DEADLINE_MS = 20_000

/**
 * autoNotify с общим дедлайном. Если провайдер завис, ответ на сохранение всё равно
 * приходит вовремя (maxDuration роутов = 30 с): статус `failed` с кодом TIMEOUT.
 * Строка журнала при этом остаётся — оператор увидит её в окне уведомления; «висящий»
 * pending через две минуты закрывается сам (см. send.ts).
 */
export async function autoNotifyWithDeadline(
	waybill: WaybillDTO,
	prevStatus: string | null,
	ms = AUTO_NOTIFY_DEADLINE_MS
): Promise<AutoNotifyResult | undefined> {
	let timer: ReturnType<typeof setTimeout> | undefined
	const deadline = new Promise<AutoNotifyResult>((resolve) => {
		timer = setTimeout(
			() =>
				resolve({
					status: 'failed',
					code: TIMEOUT,
					error: 'Провайдер WhatsApp не ответил вовремя. Сообщение могло уйти — проверьте журнал уведомлений.',
				}),
			ms
		)
	})
	try {
		return await Promise.race([autoNotify(waybill, prevStatus), deadline])
	} finally {
		if (timer) clearTimeout(timer)
	}
}
