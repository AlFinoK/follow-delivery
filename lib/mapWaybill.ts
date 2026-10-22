// Преобразование Prisma-сущности Waybill (плоские колонки) в модель формы
// ([lib/waybill/model.ts], вложенные sender/receiver/positions) и обратно.
// Держим маппинг в одном месте: его используют оба роута /api/waybills.

import type { PrismaClient } from '@prisma/client'
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

/**
 * Последняя строка журнала уведомлений по накладной (канал не важен — сейчас он один,
 * WhatsApp). status — как в журнале: pending | sent | delivered | read | failed.
 */
export interface LastNotification {
	status: string
	createdAt: string
	error: string | null
}

/** JSON-представление накладной: модель формы + служебные поля списка. */
export interface WaybillDTO extends WaybillModel {
	cargoId: string | null
	createdAt: string
	updatedAt: string
	/** Есть только в GET (список и карточка); null — клиенту ещё ничего не отправляли. */
	lastNotification?: LastNotification | null
}

/** Prisma-клиент передаёт роут: модуль импортирует только тип, без lib/prisma. */
type NotificationReader = Pick<PrismaClient, 'notification'>

/**
 * Последнее уведомление по каждой накладной из `ids` — ОДНИМ запросом (без N+1):
 * строки идут от новых к старым, первая встреченная по накладной и есть последняя.
 * Накладных на странице 12, отправок по каждой — единицы, так что выборка маленькая.
 */
export async function lastNotifications(db: NotificationReader, ids: string[]): Promise<Map<string, LastNotification>> {
	const out = new Map<string, LastNotification>()
	if (!ids.length) return out
	const rows = await db.notification.findMany({
		where: { waybillId: { in: ids } },
		orderBy: { createdAt: 'desc' },
		select: { waybillId: true, status: true, createdAt: true, error: true },
	})
	for (const r of rows) {
		if (!r.waybillId || out.has(r.waybillId)) continue
		out.set(r.waybillId, { status: r.status, createdAt: r.createdAt.toISOString(), error: r.error })
	}
	return out
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

// ── Разбор тела запроса ──────────────────────────────────────────────────────
// Сервер — последний рубеж: клиент валидирует подробнее, но API открыто любому с сессией
// (и скрипту, и старой вкладке), поэтому входные данные здесь приводятся к безопасному виду.

/** Лимиты длины строк: длиннее — обрезаем (молча: это защита, а не пользовательская ошибка). */
export const MAX_LEN = { name: 300, address: 300, phone: 300, note: 2000, short: 100 } as const

/** Верхняя граница числа: `1e308` проходит Number.isFinite, но ломает печать и суммы. */
const MAX_NUM = 1e12
/** Верхняя граница количества мест. */
const MAX_QTY = 1_000_000

const str = (v: unknown, max: number = MAX_LEN.name): string => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const nullable = (v: unknown, max: number = MAX_LEN.name): string | null => str(v, max) || null
/** Число ≥ 0: отрицательные, NaN и бесконечности дают 0, огромные — MAX_NUM. */
const num = (v: unknown): number => {
	const n = typeof v === 'number' ? v : Number(v)
	if (!Number.isFinite(n) || n < 0) return 0
	return Math.min(n, MAX_NUM)
}
/** Количество: целое от 1 (дробное «1.5» и «0.1+0.2» в печатную форму не попадают). */
const qty = (v: unknown): number => {
	const n = Math.round(num(v))
	return Math.min(MAX_QTY, Math.max(1, n))
}
const date = (v: unknown): Date | null => {
	const s = str(v, MAX_LEN.short)
	if (!s) return null
	const d = new Date(s)
	return Number.isNaN(d.getTime()) ? null : d
}
/** Страна: значение по умолчанию — ТОЛЬКО когда поля нет вовсе; явно очищенное остаётся пустым и ловится проверкой. */
const country = (v: unknown, fallback: string): string => (v === undefined || v === null ? fallback : str(v, MAX_LEN.short))

export const WAYBILL_STATUSES = ['draft', 'active', 'delivered', 'cancelled'] as const

/** Статус из тела запроса или null, если его нет / он не из списка. */
export function parseStatus(v: unknown): (typeof WAYBILL_STATUSES)[number] | null {
	const s = typeof v === 'string' ? v.trim() : ''
	return (WAYBILL_STATUSES as readonly string[]).includes(s) ? (s as (typeof WAYBILL_STATUSES)[number]) : null
}

/** Тело запроса (модель формы) → колонки Waybill. Номер и cargoId ставит роут. */
export function waybillData(body: Record<string, unknown>) {
	const asObject = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {})
	const sender = asObject(body.sender)
	const receiver = asObject(body.receiver)
	return {
		status: parseStatus(body.status) ?? 'draft',
		senderFullName: str(sender.fullName, MAX_LEN.name),
		senderType: str(sender.type, MAX_LEN.short) === 'company' ? 'company' : 'individual',
		senderCompanyName: nullable(sender.companyName, MAX_LEN.name),
		senderCompanyTin: nullable(sender.companyTin, MAX_LEN.short),
		senderContactPerson: nullable(sender.contactPerson, MAX_LEN.name),
		senderAddress: str(sender.address, MAX_LEN.address),
		senderCity: str(sender.city, MAX_LEN.short),
		senderCountry: country(sender.country, 'Казахстан'),
		receiverFullName: str(receiver.fullName, MAX_LEN.name),
		receiverPhone: str(receiver.phone, MAX_LEN.phone),
		receiverTin: nullable(receiver.tin, MAX_LEN.short),
		receiverPassport: nullable(receiver.passport, MAX_LEN.short),
		receiverAddress: str(receiver.address, MAX_LEN.address),
		receiverCity: str(receiver.city, MAX_LEN.short),
		receiverCountry: country(receiver.country, 'Россия'),
		nature: str(body.nature, MAX_LEN.name),
		packagingOk: body.packagingOk === true,
		specialInstructions: nullable(body.specialInstructions, MAX_LEN.note),
		manualVolume: body.manualVolume === true,
		volume: num(body.volume),
		payer: str(body.payer, MAX_LEN.short) === 'sender' ? 'sender' : 'receiver',
		payMethod: str(body.payMethod, MAX_LEN.short) === 'cashless' ? 'cashless' : 'cash',
		amount: num(body.amount),
		acceptanceDate: date(body.acceptanceDate),
		shipmentDate: date(body.shipmentDate),
		deliveryTimeframe: nullable(body.deliveryTimeframe, MAX_LEN.short),
	}
}

/** Позиции из тела запроса → строки WaybillItem (пустые позиции отбрасываются). */
export function waybillItems(body: Record<string, unknown>) {
	const positions = Array.isArray(body.positions) ? (body.positions as unknown[]) : []
	return positions
		.map((raw, i) => {
			const p = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
			return {
				name: str(p.name, MAX_LEN.name),
				quantity: qty(p.quantity),
				length: num(p.length),
				width: num(p.width),
				height: num(p.height),
				weight: num(p.weight),
				price: num(p.price),
				sortOrder: i,
			}
		})
		// Пустота определяется БЕЗ количества: оно всегда ≥ 1 (в форме по умолчанию 1), и
		// иначе нетронутая строка-заготовка считалась бы позицией.
		.filter((p) => p.name || p.length || p.width || p.height || p.weight || p.price)
}

/** Минимальная серверная проверка (клиент валидирует подробнее). */
export function waybillErrors(data: ReturnType<typeof waybillData>): string | null {
	if (!data.senderFullName) return 'Укажите ФИО отправителя'
	if (!data.senderAddress) return 'Укажите адрес отправителя'
	if (!data.senderCity) return 'Укажите город отправителя'
	if (!data.senderCountry) return 'Укажите страну отправителя'
	if (!data.receiverFullName) return 'Укажите ФИО получателя'
	if (!data.receiverPhone) return 'Укажите телефон получателя'
	if (!data.receiverAddress) return 'Укажите адрес доставки'
	if (!data.receiverCity) return 'Укажите город доставки'
	if (!data.receiverCountry) return 'Укажите страну получателя'
	return null
}
