// Демо-логика страницы «Создать груз». Ничего не пишет в реальную БД —
// всё живёт в состоянии страницы + sessionStorage на время демонстрации.
// Реализует рекомендации из согласованного плана (нумерация, авторасчёт объёма,
// формат сводки логистам по образцу заказчика п.3.3).

export type SenderType = 'individual' | 'company'
export type Payer = 'sender' | 'receiver'
export type PayMethod = 'cash' | 'cashless'
export type WaybillStatus = 'draft' | 'active' | 'delivered' | 'cancelled'
export type Role = 'operator' | 'logist' | 'admin'

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
	phone: string
	tin: string // ИНН/ИИН (необяз.)
	passport: string // серия и номер (необяз.)
	address: string
	city: string
	country: string
}

export interface Waybill {
	number: number | null // присваивается при «сохранении»
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
}

export const STATUS_LABELS: Record<WaybillStatus, string> = {
	draft: 'Черновик',
	active: 'Активна / В работе',
	delivered: 'Доставлена',
	cancelled: 'Отменена',
}

export const ROLE_LABELS: Record<Role, string> = {
	operator: 'Оператор',
	logist: 'Логист',
	admin: 'Администратор',
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
		packagingOk: true,
		specialInstructions: '',
		payer: 'sender',
		payMethod: 'cash',
		amount: 0,
		manualVolume: false,
		volume: 0,
		acceptanceDate: '', // проставится текущей датой на клиенте (SSR-safe)
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

// ── Форматтеры под образец заказчика (п.3.3) ────────────────────────────────
// «35.000 тенге» — точка как разделитель тысяч; «1,911 м³», «245,0 кг» — запятая.

export function fmtMoney(n: number): string {
	// целое, разделитель тысяч — точка
	const int = Math.round(n)
	return int.toLocaleString('ru-RU').replace(/ |\s/g, '.')
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
			if (p.price) lines.push(`Стоимость - ${fmtMoney(p.price)} тенге`)
		})
	}

	lines.push('Общий вес и объём:')
	lines.push(`${fmtDecimal(effectiveVolume(w))} м³`)
	lines.push(`${fmtDecimal(totalWeight(w.positions), 1)} кг`)

	push('Стоимость доставки', `${fmtMoney(w.amount)} тенге`)

	return lines.join('\n')
}

// ── Mock-нумерация (рекомендация №4): последовательный атомарный счётчик 4–6 цифр ──
// В проде — Postgres SEQUENCE / счётчик в транзакции + unique. Здесь имитируем в
// sessionStorage, старт с 2085 (как в образце заказчика).
const COUNTER_KEY = 'demo:waybillCounter'
export function nextWaybillNumber(): number {
	if (typeof window === 'undefined') return 2085
	const cur = Number(sessionStorage.getItem(COUNTER_KEY) || '2084')
	const next = cur + 1
	sessionStorage.setItem(COUNTER_KEY, String(next))
	return next
}

// Шаблон уведомления клиенту (§5): номер, статус, ссылка на отслеживание.
export function notificationText(w: Waybill): string {
	const track = w.number ? `https://ltt.kz/?id=${w.number}` : 'https://ltt.kz/'
	return `LTT: накладная №${w.number ?? '—'}. Статус: «${STATUS_LABELS[w.status]}». Отслеживание: ${track}`
}
