// HTTP-запрос к провайдеру WhatsApp с жёстким таймаутом. Только сервер.
//
// Голый fetch без сигнала может висеть сколько угодно: сервер, который принял соединение
// и не отвечает, оставляет запрос ждать дольше maxDuration, и оператор получает обрыв
// функции вместо понятной ошибки, а строка журнала остаётся в `pending`. Поэтому все
// обращения к провайдерам идут через fetchText: таймаут превращается в NotifyError
// с кодом TIMEOUT, который дальше обрабатывается как обычная неудача отправки.
//
// Тело читаем ВНУТРИ того же таймаута: сигнал обрывает и `res.text()`, а сервер, который
// отдал заголовки и замолчал, иначе всё равно подвесил бы запрос.

import { NotifyError, TIMEOUT } from './types'

/** Таймаут обычного запроса к провайдеру. */
export const REQUEST_TIMEOUT_MS = 8000

export interface TextResponse {
	ok: boolean
	status: number
	raw: string
}

export async function fetchText(url: string, init: RequestInit = {}, timeoutMs = REQUEST_TIMEOUT_MS): Promise<TextResponse> {
	try {
		const res = await fetch(url, { ...init, cache: 'no-store', signal: AbortSignal.timeout(timeoutMs) })
		const raw = await res.text()
		return { ok: res.ok, status: res.status, raw }
	} catch (e) {
		const name = e instanceof Error ? e.name : ''
		if (name === 'TimeoutError' || name === 'AbortError') {
			throw new NotifyError(TIMEOUT, `Провайдер WhatsApp не ответил за ${Math.round(timeoutMs / 1000)} с`)
		}
		throw e
	}
}
