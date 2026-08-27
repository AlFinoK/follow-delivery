// Контракт слоя уведомлений клиенту.
//
// Каналов два и они НЕ равнозначны: WhatsApp — основной, SMS — фолбэк на случай,
// когда у номера получателя WhatsApp нет. Провайдеры подключаются через env
// (см. .env.example), и если ни один не настроен, отправка не падает, а возвращает
// готовые ссылки для ручной отправки оператором (wa.me / sms:).

export type NotifyChannel = 'whatsapp' | 'sms'

/** Итог одной попытки отправки конкретным провайдером. */
export interface SendResult {
	ok: boolean
	/** id сообщения у провайдера. Нужен вебхуку, чтобы связать статус с уведомлением. */
	providerId?: string
	/** Код ошибки (см. константы ниже или код провайдера как есть). */
	code?: string
	/** Человекочитаемое описание для тоста оператору. */
	error?: string
}

/** Провайдер не настроен (нет ключей в env) — оператор отправляет вручную по ссылке. */
export const NOT_CONFIGURED = 'NOT_CONFIGURED'

/**
 * У номера нет WhatsApp — причина, по которой уведомление ушло SMS. Выясняется ДО
 * отправки: WAHA умеет проверять номер синхронно (GET /api/contacts/check-exists),
 * поэтому канал выбирается заранее и фолбэк не зависит от вебхука.
 */
export const BAD_CONTACT = 'BAD_CONTACT'

/**
 * Итог нажатия «Уведомить клиента» — то, что уходит в UI.
 * Живёт здесь, а не в [send.ts]: тот тянет prisma, а тип нужен и клиентской модалке.
 */
export interface NotifyOutcome {
	/** Каким каналом реально ушло. null — не ушло (ручной режим или ошибка). */
	channel: NotifyChannel | null
	/** sent — ушло; failed — провайдер отказал; manual — провайдера нет, отправляет оператор. */
	status: 'sent' | 'failed' | 'manual'
	notificationId?: string
	code?: string
	error?: string
	/** true — WhatsApp принят, но доставка подтвердится вебхуком (тогда же может уйти SMS). */
	pendingDelivery?: boolean
	/** Тексты и ссылки для предпросмотра и ручной отправки. */
	texts: Record<NotifyChannel, string>
	links: Record<NotifyChannel, string>
	whatsappAvailable: boolean
	smsAvailable: boolean
}

/** Строка журнала уведомлений в том виде, в каком её показывает модалка. */
export interface NotificationDTO {
	id: string
	channel: string
	status: string
	phone: string
	error: string | null
	createdAt: string
}

/**
 * Правки оператора к шаблону. Пустые/отсутствующие поля означают «взять шаблон»,
 * поэтому очистить сообщение в ноль нельзя — уйдёт стандартный текст.
 */
export interface NotifyTexts {
	whatsapp?: string
	sms?: string
}

/**
 * Состояние канала уведомлений по накладной: журнал отправок + что вообще настроено.
 * Модалка спрашивает его ПРИ ОТКРЫТИИ — иначе она не знает, рисовать кнопку
 * «Отправить» (авто) или «Открыть WhatsApp» (ручной режим), и первый клик оператора
 * уходил бы вхолостую.
 */
export interface NotifyStatus {
	items: NotificationDTO[]
	whatsappAvailable: boolean
	smsAvailable: boolean
}

/**
 * Уведомление по этой накладной уже уходило только что — повтор отклонён.
 * У WAHA нет ключа идемпотентности, поэтому дублей избегаем на своей стороне.
 */
export const RECENTLY_SENT = 'RECENTLY_SENT'

/**
 * WhatsApp принял сообщение, но не доставил (`ack = -1`).
 *
 * Отдельный код, а не общая ошибка: он означает не «отправка не удалась», а «отправка
 * прошла, доставка — нет». Практический случай — ограничение аккаунта
 * (`error 463: account restricted`), при котором `POST /api/sendText` отвечает 201,
 * и без проверки ack оператор видел бы «отправлено» при неполученном сообщении.
 */
export const DELIVERY_FAILED = 'DELIVERY_FAILED'

/** Ошибка провайдера с машинным кодом (для веток фолбэка). */
export class NotifyError extends Error {
	code: string
	constructor(code: string, message?: string) {
		super(message || code)
		this.code = code
	}
}
