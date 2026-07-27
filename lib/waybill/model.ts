// Модель транспортной накладной — общая для формы, API и печатной формы.
//
// Номер накладной выдаёт СЕРВЕР (`POST /api/waybills/number`), а не клиент —
// см. ПРАВКИ 2 п.7: клиентский счётчик в sessionStorage давал двум операторам
// один и тот же номер.

import { isValidPhoneNumber } from 'react-phone-number-input'

export type SenderType = 'individual' | 'company'
export type Payer = 'sender' | 'receiver'
export type PayMethod = 'cash' | 'cashless'
export type WaybillStatus = 'draft' | 'active' | 'delivered' | 'cancelled'

export interface Position {
	id: string
	name: string // наименование позиции («Электровелосипеды SK8»)
	quantity: number // шт
	length: number // см
	width: number // см
	height: number // см
	weight: number // кг за место
	price: number // ₸ стоимость позиции
}

export interface Sender {
	fullName: string
	type: SenderType
	companyName: string
	companyTin: string // ИНН/БИН
	contactPerson: string
	address: string
	city: string
	country: string
}

export interface Receiver {
	fullName: string
	phone: string // E.164, напр. +77021234567 (см. PhoneInput)
	tin: string // ИНН/ИИН (необяз.)
	passport: string // серия и номер (необяз.)
	address: string
	city: string
	country: string
}

export interface Waybill {
	/** cuid записи в БД; null — накладная ещё не сохранена. */
	docId: string | null
	number: number | null // резервируется сервером при открытии формы
	status: WaybillStatus
	sender: Sender
	receiver: Receiver
	nature: string // характер груза
	positions: Position[]
	packagingOk: boolean // соответствие упаковки
	specialInstructions: string
	payer: Payer
	payMethod: PayMethod
	amount: number // сумма к оплате, ₸ (тянется из калькулятора)
	manualVolume: boolean // объём задан вручную (иначе — из габаритов)
	volume: number // м³ (если manualVolume)
	acceptanceDate: string // YYYY-MM-DD
	shipmentDate: string // YYYY-MM-DD, ручной ввод (ПРАВКИ 2 п.5)
	deliveryTimeframe: string // «N|days|weeks|months», как у Cargo (ПРАВКИ 2 п.5)
}

export const STATUS_LABELS: Record<WaybillStatus, string> = {
	draft: 'Черновик',
	active: 'Активна / В работе',
	delivered: 'Доставлена',
	cancelled: 'Отменена',
}

// Быстрые варианты характера груза (§2.3). В проде пополняются из справочника.
export const NATURE_PRESETS = ['Мототехника', 'Домашние вещи']

// Подсказки для спец-инструкции (§2.3).
export const INSTRUCTION_HINTS = ['Верх не ставить', 'Не кантовать', 'Хрупкое', 'Срочная доставка']

let posSeq = 0
export const emptyPosition = (): Position => ({
	id: `pos-${++posSeq}`,
	name: '',
	quantity: 1,
	length: 0,
	width: 0,
	height: 0,
	weight: 0,
	price: 0,
})

export function initialWaybill(): Waybill {
	return {
		docId: null,
		number: null,
		status: 'draft',
		sender: {
			fullName: '',
			type: 'individual',
			companyName: '',
			companyTin: '',
			contactPerson: '',
			// Значения по умолчанию из ТЗ §2.1
			address: 'Казахстан, г. Алматы, ул. Казыбаева 44',
			city: 'Алматы',
			country: 'Казахстан',
		},
		receiver: {
			fullName: '',
			phone: '',
			tin: '',
			passport: '',
			address: '',
			city: '',
			country: 'Россия',
		},
		nature: '',
		positions: [emptyPosition()],
		packagingOk: false, // по умолчанию «Нет» (правка 5)
		specialInstructions: '',
		payer: 'receiver', // по умолчанию платит получатель (правка 6)
		payMethod: 'cash',
		amount: 0,
		manualVolume: false,
		volume: 0,
		acceptanceDate: '', // проставится текущей датой на клиенте (SSR-safe)
		shipmentDate: '',
		deliveryTimeframe: '',
	}
}

// Итоговый вес: Σ вес_места × кол-во.
export function totalWeight(positions: Position[]): number {
	return positions.reduce((s, p) => s + (p.weight || 0) * (p.quantity || 0), 0)
}

// Авто-объём из габаритов мест: Σ (Д×Ш×В см³ / 1e6) × кол-во → м³. (рекомендация №3)
export function autoVolume(positions: Position[]): number {
	return positions.reduce(
		(s, p) => s + ((p.length || 0) * (p.width || 0) * (p.height || 0)) / 1_000_000 * (p.quantity || 0),
		0
	)
}

export function effectiveVolume(w: Waybill): number {
	return w.manualVolume ? w.volume : autoVolume(w.positions)
}

/** Общая себестоимость груза: Σ цена × кол-во, ₸. */
export function totalGoodsPrice(positions: Position[]): number {
	return positions.reduce((s, p) => s + (p.price || 0) * (p.quantity || 0), 0)
}

// ── Форматтеры под образец заказчика (п.3.3) ────────────────────────────────
// «35.000 тенге» — точка как разделитель тысяч; «1,911 м³», «245,0 кг» — запятая.

export function fmtMoney(n: number): string {
	// целое, разделитель тысяч — точка
	const int = Math.round(n)
	return int.toLocaleString('ru-RU').replace(/ |\s/g, '.')
}

export function fmtDecimal(n: number, digits = 3): string {
	return n.toFixed(digits).replace('.', ',')
}

export function fmtDims(p: Position): string {
	return `${trimNum(p.length)}x${trimNum(p.width)}x${trimNum(p.height)}`
}

export function trimNum(n: number): string {
	return Number.isInteger(n) ? String(n) : String(n).replace('.', ',')
}

// ── Телефон: валидация через libphonenumber (react-phone-number-input) ───────
// Значение хранится в E.164 (+77021234567). Пустое/частичное — невалидно.
export function isPhoneValid(phone: string): boolean {
	return !!phone && isValidPhoneNumber(phone)
}

// ── Валидация накладной для гейта «Сохранить» (правка: нормальная валидация) ──
export interface WaybillError {
	step: number // на каком шаге визарда лежит поле
	message: string
}
export function validateWaybill(w: Waybill): WaybillError[] {
	const errs: WaybillError[] = []
	// Шаг 0 — отправитель и получатель
	if (!w.sender.fullName.trim()) errs.push({ step: 0, message: 'Укажите ФИО отправителя' })
	if (w.sender.type === 'company' && !w.sender.companyName.trim())
		errs.push({ step: 0, message: 'Укажите название компании-отправителя' })
	if (!w.sender.address.trim()) errs.push({ step: 0, message: 'Укажите адрес отправителя' })
	if (!w.sender.city.trim()) errs.push({ step: 0, message: 'Укажите город отправителя' })
	if (!w.receiver.fullName.trim()) errs.push({ step: 0, message: 'Укажите ФИО получателя' })
	if (!isPhoneValid(w.receiver.phone)) errs.push({ step: 0, message: 'Проверьте телефон получателя' })
	if (!w.receiver.address.trim()) errs.push({ step: 0, message: 'Укажите адрес доставки' })
	if (!w.receiver.city.trim()) errs.push({ step: 0, message: 'Укажите город доставки' })
	// Шаг 1 — груз
	if (!w.nature.trim()) errs.push({ step: 1, message: 'Укажите характер груза' })
	return errs
}

// ── Сборщик сводки для логистов (Блок №2) по образцу п.3.3 ──────────────────
// Пустые необязательные поля (ИНН/Паспорт) — строка скрывается.
export function buildLogistSummary(w: Waybill): string {
	const lines: string[] = []
	const push = (label: string, ...values: string[]) => {
		lines.push(`${label}:`)
		values.filter((v) => v && v.trim()).forEach((v) => lines.push(v))
	}

	push('Накладная', w.number ? `№${w.number}` : '№— (черновик)')

	const senderName =
		w.sender.type === 'company'
			? [w.sender.companyName, w.sender.contactPerson].filter(Boolean).join(', ') || w.sender.fullName
			: w.sender.fullName
	push('Отправитель', senderName)
	push('Получатель', w.receiver.fullName)
	push('Адрес', w.receiver.address)
	push('Телефон', w.receiver.phone)
	if (w.receiver.tin.trim()) push('ИНН', w.receiver.tin)
	if (w.receiver.passport.trim()) push('Паспорт', w.receiver.passport)

	// Характер груза как заголовок + позиции
	if (w.nature.trim()) {
		lines.push(`${w.nature}:`)
		w.positions.forEach((p) => {
			if (p.name.trim()) lines.push(`${p.name} - ${trimNum(p.quantity)}шт`)
			if (p.length || p.width || p.height) lines.push(`${fmtDims(p)} - ${trimNum(p.weight)}кг`)
			// Подпись «Стоимость» — по образцу заявки заказчика (№2782), см. ПРАВКИ 2 п.1.
			if (p.price) lines.push(`Стоимость - ${fmtMoney(p.price)} тенге`)
		})
	}

	lines.push('Общий вес и объём:')
	lines.push(`${fmtDecimal(effectiveVolume(w))} м³`)
	lines.push(`${fmtDecimal(totalWeight(w.positions), 1)} кг`)

	push('Стоимость доставки', `${fmtMoney(w.amount)} тенге`)

	return lines.join('\n')
}

// Шаблон уведомления клиенту (§5): номер, статус, ссылка на отслеживание.
export function notificationText(w: Waybill): string {
	const track = w.number ? `https://follow-delivery.vercel.app/?id=${w.number}` : 'https://follow-delivery.vercel.app/'
	return `LTT: накладная №${w.number ?? '—'}. Статус: «${STATUS_LABELS[w.status]}». Отслеживание: ${track}`
}
