// Единый контракт доступа к данным. Реализация — [httpRepo.ts] (fetch к /api/*).
// Компоненты берут репозиторий через `repos` ([repos.ts]).

import type { Cargo } from '@/components/admin/types'
import type { Preset } from '@/lib/calculator/presets'
import type { Waybill as WaybillModel, WaybillStatus } from '@/lib/waybill/model'
import type { NotificationDTO, NotifyChannel, NotifyOutcome, NotifyStatus, NotifyTexts } from '@/lib/notify/types'

export type { Cargo, Preset, WaybillModel, NotificationDTO, NotifyChannel, NotifyOutcome, NotifyStatus, NotifyTexts }

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
	search(query: string): Promise<Cargo | null>
	/** Список для админки с фильтром/поиском/пагинацией. */
	list(params: CargoListParams): Promise<CargosResponse>
	/** Груз по docId. null — не найдено (404). */
	get(docId: string): Promise<Cargo | null>
	create(body: CargoCreateInput): Promise<Cargo>
	update(docId: string, patch: CargoPatch): Promise<Cargo>
	remove(docId: string): Promise<void>
}

// ── Папки ───────────────────────────────────────────────────────────────────

export interface Folder {
	id: string
	name: string
	cargoCount: number
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
	list(): Promise<Folder[]>
	create(name: string): Promise<Folder>
	get(id: string, params: { tab?: string; page?: number }): Promise<FolderDetail | null>
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
	list(params: WaybillListParams): Promise<WaybillsResponse>
	/** Накладная по id. null — не найдена (404). */
	get(id: string): Promise<WaybillDTO | null>
	/** Накладная, привязанная к грузу. null — у груза её нет. */
	getByCargo(cargoId: string): Promise<WaybillDTO | null>
	create(body: WaybillModel): Promise<WaybillDTO>
	update(id: string, body: WaybillModel): Promise<WaybillDTO>
	remove(id: string): Promise<void>
}

// ── Уведомления клиенту (WhatsApp через Wazzup + SMS-фолбэк) ─────────────────

export interface NotifyRepo {
	/**
	 * Отправить уведомление по накладной. `channel` задаётся только при ЯВНОМ выборе
	 * оператора; по умолчанию — WhatsApp, а SMS досылает вебхук, если у номера
	 * WhatsApp не оказалось (см. [lib/notify/send.ts]).
	 */
	send(waybillId: string, channel?: NotifyChannel, texts?: NotifyTexts): Promise<NotifyOutcome>
	/** Журнал отправок по накладной + что из каналов настроено (см. NotifyStatus). */
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
