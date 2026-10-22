// Реальная реализация репозиториев — ходит в существующие /api/* эндпоинты.
// Поведение 1:1 повторяет прежние прямые fetch-вызовы, чтобы прод не изменился.

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
	NotifyOutcome,
	NotifyRepo,
	NotifyStatus,
	Preset,
	PresetRepo,
	Repos,
	WaybillDTO,
	WaybillListParams,
	WaybillRepo,
	WaybillsResponse,
} from './types'
import { RepoError } from './types'
import type { Cargo } from '@/components/admin/types'

const cargos: CargoRepo = {
	async search(query, signal) {
		// 429 — лимит публичного поиска: RepoError(429), UI показывает отдельное сообщение
		const res = await fetch(`/api/cargos?trackingId=${encodeURIComponent(query)}`, { signal })
		if (res.status === 404) return null
		if (!res.ok) throw new RepoError(res.status)
		return (await res.json()) as Cargo
	},
	async list(params: CargoListParams, signal?: AbortSignal): Promise<CargosResponse> {
		const qs = new URLSearchParams()
		if (params.status && params.status !== 'all') qs.set('status', params.status)
		if (params.q && params.q.trim()) qs.set('q', params.q.trim())
		if (params.page && params.page > 1) qs.set('page', String(params.page))
		const res = await fetch(`/api/cargos?${qs.toString()}`, { signal })
		if (!res.ok) throw new RepoError(res.status)
		return (await res.json()) as CargosResponse
	},
	async get(docId, signal) {
		const res = await fetch(`/api/cargos/${docId}`, { signal })
		if (res.status === 404) return null
		if (!res.ok) throw new RepoError(res.status)
		return (await res.json()) as Cargo
	},
	async create(body: CargoCreateInput) {
		const res = await fetch('/api/cargos', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		})
		if (!res.ok) throw new RepoError(res.status)
		return (await res.json()) as Cargo
	},
	async update(docId, patch: CargoPatch) {
		const res = await fetch(`/api/cargos/${docId}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(patch),
		})
		if (!res.ok) throw new RepoError(res.status)
		return (await res.json()) as Cargo
	},
	async remove(docId) {
		const res = await fetch(`/api/cargos/${docId}`, { method: 'DELETE' })
		if (!res.ok) throw new RepoError(res.status)
	},
}

const folders: FolderRepo = {
	async list(signal) {
		const res = await fetch('/api/folders', { signal })
		if (!res.ok) throw new RepoError(res.status)
		return (await res.json()) as Folder[]
	},
	async create(name) {
		const res = await fetch('/api/folders', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name }),
		})
		if (!res.ok) throw new RepoError(res.status)
		return (await res.json()) as Folder
	},
	async get(id, params, signal) {
		const qs = new URLSearchParams()
		if (params?.tab) qs.set('tab', params.tab)
		if (params?.page && params.page > 1) qs.set('page', String(params.page))
		const res = await fetch(`/api/folders/${id}?${qs.toString()}`, { signal })
		if (res.status === 404) return null
		if (!res.ok) throw new RepoError(res.status)
		return (await res.json()) as FolderDetail
	},
	async rename(id, name) {
		const res = await fetch(`/api/folders/${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name }),
		})
		if (!res.ok) throw new RepoError(res.status)
		return (await res.json()) as Folder
	},
	async remove(id) {
		const res = await fetch(`/api/folders/${id}`, { method: 'DELETE' })
		if (!res.ok) throw new RepoError(res.status)
	},
	async addCargos(id, numbers) {
		const res = await fetch(`/api/folders/${id}/cargos`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ numbers }),
		})
		if (!res.ok) throw new RepoError(res.status)
		return (await res.json()) as AddCargosResult
	},
	async bulkUpdate(id, patch) {
		const res = await fetch(`/api/folders/${id}/cargos`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(patch),
		})
		if (!res.ok) throw new RepoError(res.status)
		return (await res.json()) as { updated: number }
	},
}

const presets: PresetRepo = {
	async list(all = false) {
		const res = await fetch(`/api/presets${all ? '?all=1' : ''}`)
		if (!res.ok) throw new RepoError(res.status)
		return (await res.json()) as Preset[]
	},
	async create(body) {
		const res = await fetch('/api/presets', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		})
		if (!res.ok) throw new RepoError(res.status)
		return (await res.json()) as Preset
	},
	async update(id, patch) {
		const res = await fetch(`/api/presets/${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(patch),
		})
		if (!res.ok) throw new RepoError(res.status)
		return (await res.json()) as Preset
	},
	async remove(id) {
		const res = await fetch(`/api/presets/${id}`, { method: 'DELETE' })
		if (!res.ok) throw new RepoError(res.status)
	},
	async seed(force = false) {
		const res = await fetch(`/api/presets/seed${force ? '?force=1' : ''}`, { method: 'POST' })
		if (!res.ok) throw new RepoError(res.status)
		return (await res.json()) as { seeded: number; existing?: number; message?: string }
	},
}

const waybills: WaybillRepo = {
	async reserveNumber() {
		const res = await fetch('/api/waybills/number', { method: 'POST' })
		if (!res.ok) throw new RepoError(res.status)
		return ((await res.json()) as { number: number }).number
	},
	async list(params: WaybillListParams, signal?: AbortSignal) {
		const qs = new URLSearchParams()
		if (params.status && params.status !== 'all') qs.set('status', params.status)
		if (params.q && params.q.trim()) qs.set('q', params.q.trim())
		if (params.page && params.page > 1) qs.set('page', String(params.page))
		if (params.cargoId) qs.set('cargoId', params.cargoId)
		const res = await fetch(`/api/waybills?${qs.toString()}`, { signal })
		if (!res.ok) throw new RepoError(res.status)
		return (await res.json()) as WaybillsResponse
	},
	async get(id, signal) {
		const res = await fetch(`/api/waybills/${id}`, { signal })
		if (res.status === 404) return null
		if (!res.ok) throw new RepoError(res.status)
		return (await res.json()) as WaybillDTO
	},
	async getByCargo(cargoId, signal) {
		const { items } = await this.list({ cargoId }, signal)
		return items[0] ?? null
	},
	async create(body) {
		const res = await fetch('/api/waybills', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		})
		if (!res.ok) throw new RepoError(res.status, await errorText(res))
		return (await res.json()) as WaybillDTO
	},
	async update(id, body) {
		const res = await fetch(`/api/waybills/${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		})
		if (!res.ok) throw new RepoError(res.status, await errorText(res))
		return (await res.json()) as WaybillDTO
	},
	async remove(id) {
		const res = await fetch(`/api/waybills/${id}`, { method: 'DELETE' })
		if (!res.ok) throw new RepoError(res.status)
	},
}

const notify: NotifyRepo = {
	async send(waybillId, text) {
		const res = await fetch('/api/notify', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			// Правка оператора. Сервер игнорирует пустую и подставляет шаблон.
			body: JSON.stringify({ waybillId, ...(text ? { text } : {}) }),
		})
		if (!res.ok) throw new RepoError(res.status, await errorText(res))
		return (await res.json()) as NotifyOutcome
	},
	async status(waybillId) {
		const res = await fetch(`/api/notify?waybillId=${encodeURIComponent(waybillId)}`)
		if (!res.ok) throw new RepoError(res.status)
		return (await res.json()) as NotifyStatus
	},
}

// Текст ошибки из тела ответа — чтобы показать в тосте причину отказа сервера.
async function errorText(res: Response): Promise<string | undefined> {
	try {
		return ((await res.json()) as { error?: string }).error
	} catch {
		return undefined
	}
}

export const httpRepos: Repos = { cargos, folders, presets, waybills, notify }
