// Единый контракт доступа к данным. Реальная реализация ([httpRepo.ts]) ходит в
// /api/*; демо-реализация ([demoRepo.ts]) работает поверх sessionStorage и НИКОГДА
// не обращается к реальным грузам/папкам. Компоненты берут репозиторий через
// useRepos() ([useRepos.ts]) — он выбирает реализацию по контексту демо.

import type { Cargo } from '@/components/admin/types'
import type { Preset } from '@/lib/calculator/presets'

export type { Cargo, Preset }

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

export interface Repos {
	cargos: CargoRepo
	folders: FolderRepo
	presets: PresetRepo
}

/** Ошибка репозитория с HTTP-подобным статусом (для веток 404 / прочее). */
export class RepoError extends Error {
	status: number
	constructor(status: number, message?: string) {
		super(message || `Repo error ${status}`)
		this.status = status
	}
}
