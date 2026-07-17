// Демо-реализация репозиториев поверх sessionStorage-стора ([lib/demo/store.ts]).
// Повторяет серверную логику (маппинг статусов, поиск, пагинация, счётчики, вкладки
// папок), но без сети и без реальной БД. Данные стартуют пустыми.

import type {
	AddCargosResult,
	CargoCreateInput,
	CargoListParams,
	CargoPatch,
	CargoRepo,
	CargosResponse,
	Folder,
	FolderDetail,
	FolderRepo,
	Preset,
	PresetRepo,
	Repos,
} from './types'
import type { Cargo } from '@/components/admin/types'
import {
	DemoFolder,
	defaultDemoPresets,
	ensureDemoPresets,
	genId,
	getCargos,
	getFolders,
	getPresets,
	setCargos,
	setFolders,
	setPresets,
} from '@/lib/demo/store'

const CARGO_PAGE = 8
const FOLDER_PAGE = 20
const ARRIVED = 'прибыл'
const RU: Record<string, string> = { waiting: 'ожидает отправления', transit: 'в пути', arrived: ARRIVED }

const byNewest = (a: Cargo, b: Cargo) => String(b.createdAt).localeCompare(String(a.createdAt))
const isDigits = (s: string) => /^\d+$/.test(s)
const now = () => new Date().toISOString()

// Соответствие поиску q — как в API: contains по тексту + ТОЧНОЕ совпадение cargoNumber.
function matchesQuery(c: Cargo, q: string): boolean {
	const needle = q.toLowerCase()
	const hay = [c.id, c.name, c.fromCity, c.toCity, c.currentCity].filter(Boolean).map((s) => String(s).toLowerCase())
	if (hay.some((h) => h.includes(needle))) return true
	const asNum = Number(q)
	if (Number.isInteger(asNum) && asNum > 0 && c.cargoNumber === asNum) return true
	return false
}

// Порядок как в API для публичного поиска: orderBy [status asc, createdAt desc].
// Статусы кириллицей: «в пути» < «ожидает отправления» < «прибыл» по кодпоинтам.
function byStatusThenNewest(a: Cargo, b: Cargo): number {
	if (a.status !== b.status) return a.status < b.status ? -1 : 1
	return String(b.createdAt).localeCompare(String(a.createdAt))
}

const cargos: CargoRepo = {
	async search(query) {
		const raw = query.trim()
		if (!raw) return null
		const asNumber = Number(raw)
		const isDigitOnly = isDigits(raw) && Number.isInteger(asNumber) && asNumber > 0
		const upper = raw.toUpperCase()
		// where: цифры → cargoNumber ИЛИ точный trackingId; иначе — только точный trackingId.
		const matches = getCargos().filter((c) => {
			const trackMatch = c.id.toUpperCase() === upper
			return isDigitOnly ? c.cargoNumber === asNumber || trackMatch : trackMatch
		})
		if (matches.length === 0) return null
		matches.sort(byStatusThenNewest)
		return matches[0]
	},

	async list(params: CargoListParams): Promise<CargosResponse> {
		const all = getCargos()
		const q = (params.q ?? '').trim()
		// Счётчики — по ВСЕМ грузам (в API это groupBy без where: не зависит ни от q, ни от статуса).
		const counts = {
			all: all.length,
			waiting: all.filter((c) => c.status === RU.waiting).length,
			transit: all.filter((c) => c.status === RU.transit).length,
			arrived: all.filter((c) => c.status === ARRIVED).length,
		}
		const scoped = q ? all.filter((c) => matchesQuery(c, q)) : all
		const statusRu = params.status && params.status !== 'all' ? RU[params.status] ?? params.status : null
		const filtered = (statusRu ? scoped.filter((c) => c.status === statusRu) : scoped).sort(byNewest)
		const page = Math.max(1, params.page ?? 1)
		const start = (page - 1) * CARGO_PAGE
		return {
			items: filtered.slice(start, start + CARGO_PAGE),
			total: filtered.length,
			page,
			pageSize: CARGO_PAGE,
			counts,
		}
	},

	async get(docId) {
		return getCargos().find((c) => c.docId === docId) ?? null
	},

	async create(body: CargoCreateInput) {
		const created = now()
		const cargo: Cargo = {
			docId: genId('demo-cargo'),
			id: body.id,
			cargoNumber: body.cargoNumber ?? null,
			name: body.name ?? null,
			fromCity: body.fromCity,
			currentCity: body.currentCity,
			toCity: body.toCity,
			status: body.status,
			acceptanceDate: body.acceptanceDate ?? null,
			shipmentDate: body.shipmentDate ?? null,
			deliveryTimeframe: body.deliveryTimeframe ?? null,
			deliveryAmount: body.deliveryAmount ?? null,
			paymentStatus: body.paymentStatus ?? 'none',
			partialPaymentDetail: body.partialPaymentDetail ?? null,
			currency: body.currency ?? 'KZT',
			folderId: body.folderId ?? null,
			createdAt: created,
		}
		setCargos([cargo, ...getCargos()])
		return cargo
	},

	async update(docId, patch: CargoPatch) {
		const list = getCargos()
		const idx = list.findIndex((c) => c.docId === docId)
		if (idx === -1) throw new Error('not found')
		const updated = { ...list[idx], ...patch } as Cargo
		list[idx] = updated
		setCargos(list)
		return updated
	},

	async remove(docId) {
		setCargos(getCargos().filter((c) => c.docId !== docId))
	},
}

const toFolder = (f: DemoFolder): Folder => ({
	...f,
	cargoCount: getCargos().filter((c) => c.folderId === f.id && c.status !== ARRIVED).length,
})

const folders: FolderRepo = {
	async list() {
		return getFolders().map(toFolder)
	},

	async create(name) {
		const created = now()
		const f: DemoFolder = { id: genId('demo-folder'), name, createdAt: created, updatedAt: created }
		setFolders([f, ...getFolders()])
		return toFolder(f)
	},

	async get(id, params): Promise<FolderDetail | null> {
		const f = getFolders().find((x) => x.id === id)
		if (!f) return null
		const inFolder = getCargos().filter((c) => c.folderId === id)
		const counts = {
			all: inFolder.length,
			active: inFolder.filter((c) => c.status !== ARRIVED).length,
			delivered: inFolder.filter((c) => c.status === ARRIVED).length,
		}
		const tab = params.tab ?? 'active'
		const scoped =
			tab === 'delivered'
				? inFolder.filter((c) => c.status === ARRIVED)
				: tab === 'all'
					? inFolder
					: inFolder.filter((c) => c.status !== ARRIVED)
		scoped.sort(byNewest)
		const page = Math.max(1, params.page ?? 1)
		const start = (page - 1) * FOLDER_PAGE
		return {
			folder: { id: f.id, name: f.name, createdAt: f.createdAt, updatedAt: f.updatedAt },
			items: scoped.slice(start, start + FOLDER_PAGE),
			total: scoped.length,
			page,
			pageSize: FOLDER_PAGE,
			counts,
		}
	},

	async rename(id, name) {
		const list = getFolders()
		const idx = list.findIndex((f) => f.id === id)
		if (idx === -1) throw new Error('not found')
		list[idx] = { ...list[idx], name, updatedAt: now() }
		setFolders(list)
		return toFolder(list[idx])
	},

	async remove(id) {
		setFolders(getFolders().filter((f) => f.id !== id))
		// отвязываем грузы (аналог onDelete: SetNull)
		setCargos(getCargos().map((c) => (c.folderId === id ? { ...c, folderId: null } : c)))
	},

	async addCargos(id, numbers): Promise<AddCargosResult> {
		const res: AddCargosResult = { added: [], notFound: [], alreadyDelivered: [], alreadyInFolder: [], movedFromOtherFolder: [] }
		const list = getCargos()
		for (const num of numbers) {
			const cargo = list.find((c) => c.cargoNumber === num)
			if (!cargo) {
				res.notFound.push(num)
				continue
			}
			if (cargo.status === ARRIVED) {
				res.alreadyDelivered.push(num)
				continue
			}
			if (cargo.folderId === id) {
				res.alreadyInFolder.push(num)
				continue
			}
			if (cargo.folderId) res.movedFromOtherFolder.push(num)
			else res.added.push(num)
			cargo.folderId = id
		}
		setCargos(list)
		return res
	},

	async bulkUpdate(id, patch) {
		const list = getCargos()
		let updated = 0
		for (const c of list) {
			if (c.folderId !== id || c.status === ARRIVED) continue
			if (patch.currentCity !== undefined) c.currentCity = patch.currentCity
			if (patch.status !== undefined) {
				c.status = patch.status
				if (patch.status === ARRIVED) c.folderId = null // прибывшие покидают папку
			}
			updated++
		}
		setCargos(list)
		return { updated }
	},
}

const sortPresets = (list: Preset[]) => [...list].sort((a, b) => a.sortOrder - b.sortOrder)

const presets: PresetRepo = {
	async list(all = false) {
		const list = ensureDemoPresets()
		return sortPresets(all ? list : list.filter((p) => p.active))
	},
	async create(body) {
		const list = getPresets()
		const preset: Preset = {
			id: genId('demo-preset'),
			name: body.name ?? 'Без названия',
			category: body.category ?? null,
			length: body.length ?? 0,
			width: body.width ?? 0,
			height: body.height ?? 0,
			weight: body.weight ?? 0,
			basePrice: body.basePrice ?? 0,
			imageUrl: body.imageUrl ?? null,
			sortOrder: body.sortOrder ?? 0,
			active: body.active ?? true,
		}
		setPresets([...list, preset])
		return preset
	},
	async update(id, patch) {
		const list = getPresets()
		const idx = list.findIndex((p) => p.id === id)
		if (idx === -1) throw new Error('not found')
		list[idx] = { ...list[idx], ...patch }
		setPresets(list)
		return list[idx]
	},
	async remove(id) {
		setPresets(getPresets().filter((p) => p.id !== id))
	},
	async seed(force = false) {
		const existing = getPresets()
		if (existing.length > 0 && !force) {
			return { seeded: 0, existing: existing.length, message: 'Пресеты уже есть' }
		}
		const seeded = defaultDemoPresets()
		setPresets(seeded)
		return { seeded: seeded.length }
	},
}

export const demoRepos: Repos = { cargos, folders, presets }
