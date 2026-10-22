// Канал WhatsApp для уведомлений клиенту. Только сервер.
//
// Провайдер один — GREEN-API (облако, см. greenapi.ts). До 19.09.2026 работала WAHA на
// своём VPS; 2026-10-22 она удалена из кода по решению заказчика. Этот модуль оставлен
// тонкой прослойкой, чтобы send.ts и роуты не зависели от конкретного провайдера.
//
// ⚠️ Синхронно подтвердить доставку у Green-API нельзя: их журнал сообщений отстаёт до
// двух минут. Статус приходит только вебхуком /api/notify/webhook.

import * as greenapi from './greenapi'
import type { SendResult } from './types'

/** Настроен ли WhatsApp. Нет → уведомление уходит в ручной режим (ссылка wa.me). */
export function whatsappConfigured(): boolean {
	return greenapi.greenApiConfigured()
}

/**
 * Есть ли у номера WhatsApp. Бросает NotifyError, если спросить не удалось.
 *
 * ⚠️ У Green-API метод проверки врёт (возвращает «есть» на любой номер, см. greenapi.ts),
 * поэтому ответ всегда `true`, а отсутствие WhatsApp у клиента выясняется уже после
 * отправки — статусом `noAccount` в вебхуке.
 */
export async function checkNumberExists(): Promise<{ exists: boolean }> {
	return greenapi.checkNumberExists()
}

export async function sendWhatsApp(phone: string, text: string): Promise<SendResult> {
	return greenapi.sendWhatsApp(phone, text)
}
