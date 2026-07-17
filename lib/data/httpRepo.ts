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
	Preset,
	PresetRepo,
	Repos,
} from './types'
import { RepoError } from './types'
import type { Cargo } from '@/components/admin/types'

const cargos: CargoRepo = {
	async search(query) {
		const res = await fetch(`/api/cargos?trackingId=${encodeURIComponent(query)}`)
		if (res.status === 404) return null
		if (!res.ok) throw new RepoError(res.status)
		return (await res.json()) as Cargo
	},
	async list(params: CargoListParams): Promise<CargosResponse> {
		const qs = new URLSearchParams()
		if (params.status && params.status !== 'all') qs.set('status', params.status)
		if (params.q && params.q.trim()) qs.set('q', params.q.trim())
		if (params.page && params.page > 1) qs.set('page', String(params.page))
		const res = await fetch(`/api/cargos?${qs.toString()}`)
		if (!res.ok) throw new RepoError(res.status)
		return (await res.json()) as CargosResponse
	},
	async get(docId) {
		const res = await fetch(`/api/cargos/${docId}`)
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
	async list() {
		const res = await fetch('/api/folders')
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
	async get(id, params) {
		const qs = new URLSearchParams()
		if (params.tab) qs.set('tab', params.tab)
		if (params.page && params.page > 1) qs.set('page', String(params.page))
		const res = await fetch(`/api/folders/${id}?${qs.toString()}`)
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

export const httpRepos: Repos = { cargos, folders, presets }
