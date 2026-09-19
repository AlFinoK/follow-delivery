// Выбор поставщика WhatsApp. Только сервер.
//
// Провайдеров два, и переключение нужно, чтобы переезд не ронял прод: код нового
// провайдера уезжает на прод раньше, чем к нему появятся ключи, и до переключения
// переменной всё продолжает работать по-старому.
//
//   WHATSAPP_PROVIDER=greenapi → GREEN-API (облако, см. greenapi.ts) — целевой вариант
//   WHATSAPP_PROVIDER=waha     → WAHA на своём VPS (см. waha.ts) — прежняя схема
//   не задан                   → определяется по наличию ключей: Green-API, иначе WAHA
//
// ⚠️ Провайдеры отличаются НЕ только адресом. У WAHA доставка подтверждается синхронно
// (messageAck читает историю чата), у Green-API — только вебхуком: их журнал сообщений
// отстаёт до двух минут. Поэтому confirmDelivery ниже честно возвращает undefined для
// Green-API, а не притворяется, что подтвердил.

import * as greenapi from './greenapi'
import * as waha from './waha'
import type { SendResult } from './types'

export type WhatsappProvider = 'greenapi' | 'waha' | 'none'

export function whatsappProvider(): WhatsappProvider {
	const raw = process.env.WHATSAPP_PROVIDER?.trim().toLowerCase()
	if (raw === 'greenapi') return greenapi.greenApiConfigured() ? 'greenapi' : 'none'
	if (raw === 'waha') return waha.wahaConfigured() ? 'waha' : 'none'
	if (greenapi.greenApiConfigured()) return 'greenapi'
	if (waha.wahaConfigured()) return 'waha'
	return 'none'
}

export function whatsappConfigured(): boolean {
	return whatsappProvider() !== 'none'
}

/**
 * Есть ли у номера WhatsApp. Бросает NotifyError, если спросить не удалось.
 *
 * ⚠️ Отвечает осмысленно только WAHA. У Green-API метод проверки врёт (возвращает «есть»
 * на любой номер, см. greenapi.ts), поэтому там ответ всегда `true`, а отсутствие
 * WhatsApp у клиента выясняется уже после отправки — вебхуком или таймаутом.
 */
export async function checkNumberExists(phone: string): Promise<{ exists: boolean; chatId?: string }> {
	return whatsappProvider() === 'greenapi' ? greenapi.checkNumberExists() : waha.checkNumberExists(phone)
}

export async function sendWhatsApp(phone: string, text: string, chatId?: string): Promise<SendResult> {
	return whatsappProvider() === 'greenapi' ? greenapi.sendWhatsApp(phone, text) : waha.sendWhatsApp(phone, text, chatId)
}

/**
 * Синхронное подтверждение доставки.
 *
 * `-1` — WhatsApp принял сообщение, но доставить не смог; `>= 1` — доставлено.
 * `undefined` — подтвердить нечем ЗДЕСЬ И СЕЙЧАС: либо статус ещё не проставился, либо
 * провайдер его синхронно не отдаёт (Green-API). Это не ошибка отправки: дальше статус
 * уточнит вебхук, а если он не придёт вовсе — сработает досылка по таймауту в
 * /api/notify/sweep.
 */
export async function confirmDelivery(chatId: string, messageId?: string): Promise<number | undefined> {
	if (whatsappProvider() !== 'waha') return undefined
	return waha.messageAck(chatId, messageId)
}
