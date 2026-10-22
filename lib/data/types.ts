// Единый контракт доступа к данным. Реализация — [httpRepo.ts] (fetch к /api/*).
// Компоненты берут репозиторий через `repos` ([repos.ts]).

import type { Cargo } from '@/components/admin/types'
import type { Preset } from '@/lib/calculator/presets'
import type { Waybill as WaybillModel, WaybillStatus } from '@/lib/waybill/model'
import type { NotificationDTO, NotifyOutcome, NotifyStatus } from '@/lib/notify/types'

export type { Cargo, Preset, WaybillModel, NotificationDTO, NotifyOutcome, NotifyStatus }

// ── Грузы ───────────────────────────────────────────────────────────────────

export interface CargosResponse {
	items: Cargo[]
	total: number
	page: number
	pageSize: number
	counts: { all: number; waiting: number; transit: number; arrived: number }
}

export interface CargoListParams {
	status?: 'waiting' | 'transit' | 'arrived' | 'all' | string
	q?: string
	page?: number
}

/** Тело POST /api/cargos (см. NewCargoForm). */
export interface CargoCreateInput {
	id: string
	cargoNumber?: number | null
	name?: string | null
	fromCity: string
	currentCity: string
	toCity: string
	status: string
	acceptanceDate?: string | null
	shipmentDate?: string | null
	deliveryTimeframe?: string | null
	deliveryAmount?: number | null
	paymentStatus?: string
	partialPaymentDetail?: string | null
	currency?: string
	folderId?: string | null
}

export type CargoPatch = Partial<Omit<CargoCreateInput, 'id'>> & { folderId?: string | null }

export interface CargoRepo {
	/** Публичный поиск по трек-номеру или номеру груза. null — не найдено (404). */
	search(query: string, signal?: AbortSignal): Promise<Cargo | null>
	/** Список для админки с фильтром/поиском/пагинацией. */
	list(params: CargoListParams, signal?: AbortSignal): Promise<CargosResponse>
	/** Груз по docId. null — не найдено (404). */
	get(docId: string, signal?: AbortSignal): Promise<Cargo | null>
	create(body: CargoCreateInput): Promise<Cargo>
	update(docId: string, patch: CargoPatch): Promise<Cargo>
	remove(docId: string): Promise<void>
}

// ── Папки ───────────────────────────────────────────────────────────────────

export interface Folder {
	id: string
	name: string
	/** Активные грузы (статус не «прибыл»). */
	cargoCount: number
	/** Прибывшие и всего — UI показывает, если API их отдаёт (сейчас GET /api/folders их не считает). */
	deliveredCount?: number
	totalCount?: number
	createdAt: string
	updatedAt: string
}

export interface FolderDetail {
	folder: { id: string; name: string; createdAt: string; updatedAt: string }
	items: Cargo[]
	total: number
	page: number
	pageSize: number
	counts: { all: number; active: number; delivered: number }
}

export interface AddCargosResult {
	added: number[]
	notFound: number[]
	alreadyDelivered: number[]
	alreadyInFolder: number[]
	movedFromOtherFolder: number[]
}

export interface FolderRepo {
	list(signal?: AbortSignal): Promise<Folder[]>
	create(name: string): Promise<Folder>
	get(id: string, params?: { tab?: string; page?: number }, signal?: AbortSignal): Promise<FolderDetail | null>
	rename(id: string, name: string): Promise<Folder>
	remove(id: string): Promise<void>
	addCargos(id: string, numbers: number[]): Promise<AddCargosResult>
	bulkUpdate(id: string, patch: { currentCity?: string; status?: string }): Promise<{ updated: number }>
}

// ── Пресеты (шаблоны техники) ─────────────────────────────────────────────────

export interface PresetRepo {
	list(all?: boolean): Promise<Preset[]>
	create(body: Partial<Preset>): Promise<Preset>
	update(id: string, patch: Partial<Preset>): Promise<Preset>
	remove(id: string): Promise<void>
	seed(force?: boolean): Promise<{ seeded: number; existing?: number; message?: string }>
}

// ── Накладные (ПРАВКИ 2, п.6) ────────────────────────────────────────────────

/** Накладная в том виде, как её отдаёт API: модель формы + служебные поля. */
export interface WaybillDTO extends WaybillModel {
	cargoId: string | null
	createdAt: string
	updatedAt: string
	/**
	 * Итог автоуведомления — приходит только в ответ на create/update и только если
	 * накладная в этот момент стала активной. Нужен, чтобы оператор увидел тост
	 * «клиент уведомлён», а не гадал, ушло что-то или нет.
	 */
	notified?: { status: 'sent' | 'failed' | 'manual' | 'skipped'; error?: string; code?: string }
	/**
	 * Последняя строка журнала уведомлений (канал не важен). Приходит в GET списка и
	 * карточки; null — клиенту ещё ничего не отправляли; в ответах POST/PATCH поля нет.
	 */
	lastNotification?: LastNotification | null
}

/** Последнее уведомление клиенту по накладной (см. lib/mapWaybill.ts → lastNotifications). */
export interface LastNotification {
	/** pending | sent | delivered | read | failed — как в журнале Notification. */
	status: string
	createdAt: string
	/** «КОД: описание» для failed; переводится через notifyErrors. */
	error: string | null
}

export interface WaybillsResponse {
	items: WaybillDTO[]
	total: number
	page: number
	pageSize: number
	counts: { all: number; draft: number; active: number; delivered: number; cancelled: number }
}

export interface WaybillListParams {
	status?: WaybillStatus | 'all'
	q?: string
	page?: number
	/** Накладная конкретного груза (блок «Накладная» на карточке груза). */
	cargoId?: string
}

export interface WaybillRepo {
	/** Зарезервировать номер накладной (сервер, атомарно — см. ПРАВКИ 2 п.7). */
	reserveNumber(): Promise<number>
	list(params: WaybillListParams, signal?: AbortSignal): Promise<WaybillsResponse>
	/** Накладная по id. null — не найдена (404). */
	get(id: string, signal?: AbortSignal): Promise<WaybillDTO | null>
	/** Накладная, привязанная к грузу. null — у груза её нет. */
	getByCargo(cargoId: string, signal?: AbortSignal): Promise<WaybillDTO | null>
	/** cargoId — привязать накладную к существующему грузу (кнопка на карточке груза). */
	create(body: WaybillModel & { cargoId?: string }): Promise<WaybillDTO>
	update(id: string, body: WaybillModel): Promise<WaybillDTO>
	remove(id: string): Promise<void>
}

// ── Уведомления клиенту (WhatsApp) ───────────────────────────────────────────

export interface NotifyRepo {
	/**
	 * Отправить уведомление по накладной. `text` — правка оператора к шаблону; без неё
	 * сервер соберёт шаблон сам (см. [lib/notify/send.ts]).
	 */
	send(waybillId: string, text?: string): Promise<NotifyOutcome>
	/** Журнал отправок по накладной + настроен ли WhatsApp (см. NotifyStatus). */
	status(waybillId: string): Promise<NotifyStatus>
}

export interface Repos {
	cargos: CargoRepo
	folders: FolderRepo
	presets: PresetRepo
	waybills: WaybillRepo
	notify: NotifyRepo
}

/** Ошибка репозитория с HTTP-подобным статусом (для веток 404 / прочее). */
export class RepoError extends Error {
	status: number
	constructor(status: number, message?: string) {
		super(message || `Repo error ${status}`)
		this.status = status
	}
}
