// Преобразование Prisma-сущности Waybill (плоские колонки) в модель формы
// ([lib/waybill/model.ts], вложенные sender/receiver/positions) и обратно.
// Держим маппинг в одном месте: его используют оба роута /api/waybills.

import type { Waybill as WaybillModel, WaybillStatus } from '@/lib/waybill/model'

interface WaybillItemRow {
	id: string
	name: string
	quantity: number
	length: number
	width: number
	height: number
	weight: number
	price: number
	sortOrder: number
}

export interface WaybillRow {
	id: string
	number: number
	status: string
	senderFullName: string
	senderType: string
	senderCompanyName: string | null
	senderCompanyTin: string | null
	senderContactPerson: string | null
	senderAddress: string
	senderCity: string
	senderCountry: string
	receiverFullName: string
	receiverPhone: string
	receiverTin: string | null
	receiverPassport: string | null
	receiverAddress: string
	receiverCity: string
	receiverCountry: string
	nature: string
	packagingOk: boolean
	specialInstructions: string | null
	manualVolume: boolean
	volume: number
	payer: string
	payMethod: string
	amount: number
	acceptanceDate: Date | null
	shipmentDate: Date | null
	deliveryTimeframe: string | null
	cargoId: string | null
	createdAt: Date
	updatedAt: Date
	items?: WaybillItemRow[]
}

/** JSON-представление накладной: модель формы + служебные поля списка. */
export interface WaybillDTO extends WaybillModel {
	cargoId: string | null
	createdAt: string
	updatedAt: string
}

/** DateTime → 'YYYY-MM-DD' (формат, с которым работают DatePickerField и форма). */
const day = (d: Date | null): string => (d ? d.toISOString().slice(0, 10) : '')

export function mapWaybill(w: WaybillRow): WaybillDTO {
	return {
		docId: w.id,
		number: w.number,
		status: w.status as WaybillStatus,
		sender: {
			fullName: w.senderFullName,
			type: w.senderType === 'company' ? 'company' : 'individual',
			companyName: w.senderCompanyName ?? '',
			companyTin: w.senderCompanyTin ?? '',
			contactPerson: w.senderContactPerson ?? '',
			address: w.senderAddress,
			city: w.senderCity,
			country: w.senderCountry,
		},
		receiver: {
			fullName: w.receiverFullName,
			phone: w.receiverPhone,
			tin: w.receiverTin ?? '',
			passport: w.receiverPassport ?? '',
			address: w.receiverAddress,
			city: w.receiverCity,
			country: w.receiverCountry,
		},
		nature: w.nature,
		positions: (w.items ?? [])
			.slice()
			.sort((a, b) => a.sortOrder - b.sortOrder)
			.map((i) => ({
				id: i.id,
				name: i.name,
				quantity: i.quantity,
				length: i.length,
				width: i.width,
				height: i.height,
				weight: i.weight,
				price: i.price,
			})),
		packagingOk: w.packagingOk,
		specialInstructions: w.specialInstructions ?? '',
		payer: w.payer === 'sender' ? 'sender' : 'receiver',
		payMethod: w.payMethod === 'cashless' ? 'cashless' : 'cash',
		amount: w.amount,
		manualVolume: w.manualVolume,
		volume: w.volume,
		acceptanceDate: day(w.acceptanceDate),
		shipmentDate: day(w.shipmentDate),
		deliveryTimeframe: w.deliveryTimeframe ?? '',
		cargoId: w.cargoId,
		createdAt: w.createdAt.toISOString(),
		updatedAt: w.updatedAt.toISOString(),
	}
}

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')
const nullable = (v: unknown): string | null => str(v) || null
const num = (v: unknown): number => {
	const n = typeof v === 'number' ? v : Number(v)
	return Number.isFinite(n) ? n : 0
}
const date = (v: unknown): Date | null => {
	const s = str(v)
	if (!s) return null
	const d = new Date(s)
	return Number.isNaN(d.getTime()) ? null : d
}

const STATUSES = ['draft', 'active', 'delivered', 'cancelled']

/** Тело запроса (модель формы) → колонки Waybill. Номер и cargoId ставит роут. */
export function waybillData(body: Record<string, unknown>) {
	const sender = (body.sender ?? {}) as Record<string, unknown>
	const receiver = (body.receiver ?? {}) as Record<string, unknown>
	const status = str(body.status)
	return {
		status: STATUSES.includes(status) ? status : 'draft',
		senderFullName: str(sender.fullName),
		senderType: str(sender.type) === 'company' ? 'company' : 'individual',
		senderCompanyName: nullable(sender.companyName),
		senderCompanyTin: nullable(sender.companyTin),
		senderContactPerson: nullable(sender.contactPerson),
		senderAddress: str(sender.address),
		senderCity: str(sender.city),
		senderCountry: str(sender.country) || 'Казахстан',
		receiverFullName: str(receiver.fullName),
		receiverPhone: str(receiver.phone),
		receiverTin: nullable(receiver.tin),
		receiverPassport: nullable(receiver.passport),
		receiverAddress: str(receiver.address),
		receiverCity: str(receiver.city),
		receiverCountry: str(receiver.country) || 'Россия',
		nature: str(body.nature),
		packagingOk: body.packagingOk === true,
		specialInstructions: nullable(body.specialInstructions),
		manualVolume: body.manualVolume === true,
		volume: num(body.volume),
		payer: str(body.payer) === 'sender' ? 'sender' : 'receiver',
		payMethod: str(body.payMethod) === 'cashless' ? 'cashless' : 'cash',
		amount: num(body.amount),
		acceptanceDate: date(body.acceptanceDate),
		shipmentDate: date(body.shipmentDate),
		deliveryTimeframe: nullable(body.deliveryTimeframe),
	}
}

/** Позиции из тела запроса → строки WaybillItem (пустые позиции отбрасываются). */
export function waybillItems(body: Record<string, unknown>) {
	const positions = Array.isArray(body.positions) ? (body.positions as Record<string, unknown>[]) : []
	return positions
		.map((p, i) => ({
			name: str(p.name),
			quantity: num(p.quantity),
			length: num(p.length),
			width: num(p.width),
			height: num(p.height),
			weight: num(p.weight),
			price: num(p.price),
			sortOrder: i,
		}))
		.filter((p) => p.name || p.quantity || p.length || p.width || p.height || p.weight || p.price)
}

/** Минимальная серверная проверка (клиент валидирует подробнее). */
export function waybillErrors(data: ReturnType<typeof waybillData>): string | null {
	if (!data.senderFullName) return 'Укажите ФИО отправителя'
	if (!data.senderAddress) return 'Укажите адрес отправителя'
	if (!data.senderCity) return 'Укажите город отправителя'
	if (!data.receiverFullName) return 'Укажите ФИО получателя'
	if (!data.receiverPhone) return 'Укажите телефон получателя'
	if (!data.receiverAddress) return 'Укажите адрес доставки'
	if (!data.receiverCity) return 'Укажите город доставки'
	return null
}
