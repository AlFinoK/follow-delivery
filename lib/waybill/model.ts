// Модель транспортной накладной — общая для формы, API и печатной формы.
//
// Номер накладной выдаёт СЕРВЕР (`POST /api/waybills/number`), а не клиент —
// см. ПРАВКИ 2 п.7: клиентский счётчик в sessionStorage давал двум операторам
// один и тот же номер.

import { isValidPhoneNumber } from 'react-phone-number-input'
import type { TranslationKey } from '@/lib/i18n'
import { effectiveVolume, fmtDecimal, fmtDims, fmtMoney, totalWeight, trimNum } from './totals'

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

// Итоги и форматтеры переехали в [totals.ts] — там нет импорта
// `react-phone-number-input`, из-за которого этот модуль нельзя вычислять на сервере
// (см. комментарий в totals.ts). Здесь оставлен реэкспорт: импорты из model.ts,
// которых по проекту много, продолжают работать.
export {
	autoVolume,
	effectiveVolume,
	fmtDecimal,
	fmtDims,
	fmtMoney,
	totalGoodsPrice,
	totalWeight,
	trimNum,
} from './totals'

// ── Телефон: валидация через libphonenumber (react-phone-number-input) ───────
// Значение хранится в E.164 (+77021234567). Пустое/частичное — невалидно.
export function isPhoneValid(phone: string): boolean {
	return !!phone && isValidPhoneNumber(phone)
}

// ── Валидация накладной для гейта «Сохранить» (правка: нормальная валидация) ──
// Ошибка — ключ словаря, а не готовый текст: тост показывается на языке интерфейса.
export interface WaybillError {
	step: number // на каком шаге визарда лежит поле
	key: TranslationKey
}
export function validateWaybill(w: Waybill): WaybillError[] {
	const errs: WaybillError[] = []
	// Шаг 0 — отправитель и получатель
	if (!w.sender.fullName.trim()) errs.push({ step: 0, key: 'wvSenderName' })
	if (w.sender.type === 'company' && !w.sender.companyName.trim())
		errs.push({ step: 0, key: 'wvCompanyName' })
	if (!w.sender.address.trim()) errs.push({ step: 0, key: 'wvSenderAddress' })
	if (!w.sender.city.trim()) errs.push({ step: 0, key: 'wvSenderCity' })
	if (!w.receiver.fullName.trim()) errs.push({ step: 0, key: 'wvReceiverName' })
	if (!isPhoneValid(w.receiver.phone)) errs.push({ step: 0, key: 'wvPhone' })
	if (!w.receiver.address.trim()) errs.push({ step: 0, key: 'wvDeliveryAddress' })
	if (!w.receiver.city.trim()) errs.push({ step: 0, key: 'wvDeliveryCity' })
	// Шаг 1 — груз
	if (!w.nature.trim()) errs.push({ step: 1, key: 'wvNature' })
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
