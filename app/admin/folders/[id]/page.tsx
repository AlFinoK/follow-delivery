'use client'

import { use, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
	ArrowLeft, Pencil, Trash2, Check, X, Plus, Package, MapPin, ArrowRight,
	ChevronLeft, ChevronRight,
} from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { ToastItem } from '@/components/Toast'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { DeleteModal } from '@/components/admin/DeleteModal'
import { PageLoader } from '@/components/PageLoader'
import { Spinner } from '@/components/Spinner'
import { CitySelect, StatusSelect } from '@/components/admin/Selects'
import type { Toast } from '@/components/Toast'
import type { Cargo } from '@/components/admin/types'

interface FolderResponse {
	folder: { id: string; name: string; createdAt: string; updatedAt: string }
	items: Cargo[]
	total: number
	page: number
	pageSize: number
	counts: { all: number; active: number; delivered: number }
}

function getStatusBadge(status: string, t: (k: any) => string) {
	if (status === 'в пути') return { label: t('statusInTransit'), cls: 'bg-blue-50 text-blue-700 border-blue-200' }
	if (status === 'прибыл') return { label: t('statusArrived'), cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
	return { label: t('statusWaiting'), cls: 'bg-amber-50 text-amber-700 border-amber-200' }
}

type CargoTab = 'active' | 'delivered' | 'all'

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
	<p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">{children}</p>
)

export default function FolderDetailPage({ params }: { params: Promise<{ id: string }> }) {
	const { id: folderId } = use(params)
	const { t, tf } = useLang()
	const router = useRouter()

	const [mounted, setMounted] = useState(false)
	const [minLoadDone, setMinLoadDone] = useState(false)
	const [data, setData] = useState<FolderResponse | null>(null)
	const [loading, setLoading] = useState(true)
	const [toasts, setToasts] = useState<Toast[]>([])

	const [renaming, setRenaming] = useState(false)
	const [renameValue, setRenameValue] = useState('')
	const [savingName, setSavingName] = useState(false)

	const [showDeleteModal, setShowDeleteModal] = useState(false)

	const [addInput, setAddInput] = useState('')
	const [adding, setAdding] = useState(false)

	const [bulkCity, setBulkCity] = useState('')
	const [bulkStatus, setBulkStatus] = useState('')
	const [bulkUpdating, setBulkUpdating] = useState(false)

	const [tab, setTab] = useState<CargoTab>('active')
	const [page, setPage] = useState(1)

	const addToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
		const tid = Date.now().toString()
		setToasts((prev) => [...prev, { id: tid, message, type }])
		setTimeout(() => {
			setToasts((prev) => prev.map((x) => (x.id === tid ? { ...x, exiting: true } : x)))
			setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== tid)), 350)
		}, 5000)
	}, [])

	const loadFolder = useCallback(async (silent = false) => {
		if (!silent) setLoading(true)
		try {
			const params = new URLSearchParams({ tab, page: String(page) })
			const res = await fetch(`/api/folders/${folderId}?${params.toString()}`)
			if (res.status === 404) { router.push('/admin/folders'); return }
			if (!res.ok) throw new Error()
			setData(await res.json())
		} catch {
			addToast(t('loadError'), 'error')
		} finally {
			if (!silent) setLoading(false)
		}
	}, [folderId, router, addToast, t, tab, page])

	useEffect(() => {
		setMounted(true)
		const timer = setTimeout(() => setMinLoadDone(true), 444)
		return () => clearTimeout(timer)
	}, [])

	useEffect(() => { void loadFolder() }, [loadFolder])

	useEffect(() => { setPage(1) }, [tab])

	const folder = data?.folder
	const items = data?.items ?? []
	const counts = data?.counts ?? { all: 0, active: 0, delivered: 0 }
	const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1
	const currentPage = Math.min(page, totalPages)

	const startRename = () => { if (folder) { setRenameValue(folder.name); setRenaming(true) } }
	const cancelRename = () => { setRenaming(false); setRenameValue('') }

	const saveRename = async () => {
		if (!folder) return
		const name = renameValue.trim()
		if (!name) { addToast(t('folderNameEmpty'), 'error'); return }
		if (name === folder.name) { cancelRename(); return }
		setSavingName(true)
		try {
			const res = await fetch(`/api/folders/${folder.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name }),
			})
			if (!res.ok) throw new Error()
			setData((d) => d ? { ...d, folder: { ...d.folder, name } } : d)
			setRenaming(false)
			setRenameValue('')
			addToast(t('folderRenamed'), 'success')
		} catch {
			addToast(t('folderRenameError'), 'error')
		} finally {
			setSavingName(false)
		}
	}

	const handleDelete = async () => {
		if (!folder) return
		try {
			const res = await fetch(`/api/folders/${folder.id}`, { method: 'DELETE' })
			if (!res.ok) throw new Error()
			sessionStorage.setItem('pendingToast', JSON.stringify({ message: t('folderDeleted'), type: 'success' }))
			router.push('/admin/folders')
		} catch {
			addToast(t('folderDeleteError'), 'error')
		}
	}

	const parseNumbers = (raw: string): number[] => {
		return Array.from(
			new Set(
				raw
					.split(/[\s,;]+/)
					.map((s) => s.trim())
					.filter(Boolean)
					.map((s) => Number(s))
					.filter((n) => Number.isInteger(n) && n > 0),
			),
		)
	}

	const handleAddCargos = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!folder) return
		const numbers = parseNumbers(addInput)
		if (numbers.length === 0) return
		setAdding(true)
		try {
			const res = await fetch(`/api/folders/${folder.id}/cargos`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ numbers }),
			})
			if (!res.ok) throw new Error()
			const result: { added: number[]; notFound: number[]; alreadyDelivered: number[]; alreadyInFolder: number[]; movedFromOtherFolder: number[] } = await res.json()
			if (result.added.length > 0) addToast(tf('cargosAddedToast', { count: result.added.length }), 'success')
			if (result.movedFromOtherFolder.length > 0) addToast(tf('cargosMovedToast', { numbers: result.movedFromOtherFolder.join(', ') }), 'success')
			if (result.alreadyInFolder.length > 0) addToast(tf('cargosAlreadyInFolderToast', { numbers: result.alreadyInFolder.join(', ') }), 'error')
			if (result.notFound.length > 0) addToast(tf('cargosNotFoundToast', { numbers: result.notFound.join(', ') }), 'error')
			if (result.alreadyDelivered.length > 0) addToast(tf('cargosAlreadyDeliveredToast', { numbers: result.alreadyDelivered.join(', ') }), 'error')
			setAddInput('')
			if (result.added.length > 0 || result.movedFromOtherFolder.length > 0) await loadFolder(true)
		} catch {
			addToast(t('createError'), 'error')
		} finally {
			setAdding(false)
		}
	}

	const handleBulkUpdate = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!folder) return
		const body: Record<string, string> = {}
		if (bulkCity.trim()) body.currentCity = bulkCity.trim()
		if (bulkStatus) body.status = bulkStatus
		if (Object.keys(body).length === 0) { addToast(t('bulkNothingToUpdate'), 'error'); return }
		setBulkUpdating(true)
		try {
			const res = await fetch(`/api/folders/${folder.id}/cargos`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			})
			if (!res.ok) throw new Error()
			const result: { updated: number } = await res.json()
			addToast(tf('bulkUpdatedToast', { count: result.updated }), 'success')
			setBulkCity('')
			setBulkStatus('')
			await loadFolder(true)
		} catch {
			addToast(t('bulkUpdateError'), 'error')
		} finally {
			setBulkUpdating(false)
		}
	}

	const handleRemoveFromFolder = async (docId: string) => {
		try {
			const res = await fetch(`/api/cargos/${docId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ folderId: null }),
			})
			if (!res.ok) throw new Error()
			await loadFolder(true)
		} catch {
			addToast(t('removeFromFolderError'), 'error')
		}
	}

	if (!mounted) return <div suppressHydrationWarning />
	if (!minLoadDone || loading) return <PageLoader />
	if (!folder) return null

	return (
		<div className="min-h-screen bg-slate-50" suppressHydrationWarning>
			<AdminSidebar />

			<div className="lg:ml-64 min-h-screen flex flex-col">
				<div className="fixed top-20 lg:top-4 right-4 z-50 flex flex-col gap-2 max-w-xs">
					{toasts.map((toast) => (
						<ToastItem key={toast.id} toast={toast} />
					))}
				</div>

				<main className="flex-1 p-4 sm:p-6 pb-12">
				<div className="max-w-4xl mx-auto">
					<div className="flex items-center justify-between gap-3 mb-5">
						<button
							onClick={() => router.push('/admin/folders')}
							className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-900 font-medium text-sm transition-colors">
							<ArrowLeft className="w-4 h-4" />
							{t('backToList')}
						</button>
						<h1 className="text-lg font-semibold text-slate-900">{t('foldersNavLink')}</h1>
					</div>

					<div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-4">
						<div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-start gap-3">
							<div className="flex-1 min-w-0">
								{renaming ? (
									<div className="flex gap-2">
										<input
											type="text"
											value={renameValue}
											onChange={(e) => setRenameValue(e.target.value)}
											autoFocus
											className="flex-1 px-3 py-2 text-sm font-medium text-slate-900 bg-white border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 rounded-lg outline-none transition-all"
										/>
										<button
											onClick={saveRename}
											disabled={savingName}
											className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white rounded-lg text-sm font-semibold transition-colors border border-transparent">
											{savingName ? <Spinner className="w-4 h-4 text-white" /> : <Check className="w-4 h-4" />}
											{t('saveFolderName')}
										</button>
										<button
											onClick={cancelRename}
											className="inline-flex items-center justify-center px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-semibold transition-colors">
											<X className="w-4 h-4" />
										</button>
									</div>
								) : (
									<h2 className="text-xl font-semibold text-slate-900 break-words">{folder.name}</h2>
								)}
								<div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs">
									<span className="text-orange-600 font-medium">{tf('folderActiveCount', { count: counts.active })}</span>
									<span className="text-slate-500">{tf('folderTotalCargos', { count: counts.all })}</span>
								</div>
							</div>
							<div className="flex gap-2 shrink-0">
								{!renaming && (
									<button
										onClick={startRename}
										className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors">
										<Pencil className="w-3.5 h-3.5" />
										{t('renameFolderButton')}
									</button>
								)}
								<button
									onClick={() => setShowDeleteModal(true)}
									className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-red-600 bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-lg transition-colors">
									<Trash2 className="w-3.5 h-3.5" />
									{t('deleteButton')}
								</button>
							</div>
						</div>
					</div>

					<div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 sm:p-6 mb-4">
						<SectionTitle>{t('addCargosTitle')}</SectionTitle>
						<p className="text-xs text-slate-500 mb-3">{t('addCargosHint')}</p>
						<form onSubmit={handleAddCargos} className="flex flex-col sm:flex-row gap-2">
							<input
								type="text"
								value={addInput}
								onChange={(e) => setAddInput(e.target.value)}
								placeholder={t('addCargosPlaceholder')}
								className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all text-sm font-medium"
							/>
							<button
								type="submit"
								disabled={adding || !addInput.trim()}
								className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg disabled:opacity-50 transition-colors text-sm">
								{adding ? <Spinner className="w-4 h-4 text-white" /> : <Plus className="w-4 h-4" />}
								{t('addCargosButton')}
							</button>
						</form>
					</div>

					<div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 sm:p-6 mb-4">
						<SectionTitle>{t('bulkUpdateTitle')}</SectionTitle>
						<p className="text-xs text-slate-500 mb-3">{t('bulkUpdateHint')}</p>
						<form onSubmit={handleBulkUpdate} className="flex flex-col gap-3">
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
								<div>
									<p className="text-xs font-medium text-slate-700 mb-1.5">{t('currentLocationLabel')}</p>
									<CitySelect value={bulkCity} onChange={setBulkCity} placeholder={t('selectCity')} />
								</div>
								<div>
									<p className="text-xs font-medium text-slate-700 mb-1.5">{t('statusCardLabel')}</p>
									<StatusSelect value={bulkStatus || 'ожидает отправления'} onChange={setBulkStatus} />
								</div>
							</div>
							<button
								type="submit"
								disabled={bulkUpdating || (!bulkCity.trim() && !bulkStatus)}
								className="self-end inline-flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg disabled:opacity-50 transition-colors text-sm">
								{bulkUpdating ? <Spinner className="w-4 h-4 text-white" /> : <Check className="w-4 h-4" />}
								{t('bulkUpdateButton')}
							</button>
						</form>
					</div>

					<div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 sm:p-6">
						<div className="flex items-center justify-between gap-3 mb-4">
							<h3 className="text-base font-semibold text-slate-900">{t('cargosTitle')}</h3>
						</div>

						<div className="flex flex-wrap gap-1.5 mb-4">
							{([
								{ key: 'active' as const, label: t('folderTabActive'), count: counts.active },
								{ key: 'delivered' as const, label: t('folderTabDelivered'), count: counts.delivered },
								{ key: 'all' as const, label: t('folderTabAll'), count: counts.all },
							]).map((tt) => {
								const isActive = tab === tt.key
								return (
									<button
										key={tt.key}
										onClick={() => setTab(tt.key)}
										className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-all ${
											isActive
												? 'bg-slate-900 text-white border-slate-900'
												: 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900'
										}`}>
										{tt.label}
										<span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${isActive ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500'}`}>
											{tt.count}
										</span>
									</button>
								)
							})}
						</div>

						{items.length === 0 ? (
							<div className="text-center py-8">
								<Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
								<p className="text-slate-500 text-sm">{t('folderEmptyCargos')}</p>
							</div>
						) : (
							<div className="space-y-2">
								{items.map((c) => {
									const badge = getStatusBadge(c.status, t)
									return (
										<div
											key={c.docId}
											className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-3 hover:border-slate-300 transition-all">
											<Link
												href={`/admin/cargo/${c.docId}?returnTo=${encodeURIComponent(`/admin/folders/${folder.id}`)}`}
												className="flex-1 min-w-0 group">
												<div className="flex items-center gap-2">
													<div className="flex-1 min-w-0">
														<p className="font-semibold text-slate-900 text-sm truncate group-hover:text-orange-600 transition-colors">
															{c.cargoNumber != null && <span className="text-orange-600 mr-1.5">№{c.cargoNumber}</span>}
															{c.name || <span className="text-slate-400 italic">{t('noName')}</span>}
														</p>
														<div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5 truncate">
															<Package className="w-3 h-3 shrink-0" />
															<span className="truncate">{c.fromCity}</span>
															<ArrowRight className="w-2.5 h-2.5 shrink-0" />
															<MapPin className="w-3 h-3 text-orange-500 shrink-0" />
															<span className="text-slate-700 font-medium truncate">{c.currentCity}</span>
															<ArrowRight className="w-2.5 h-2.5 shrink-0" />
															<span className="truncate">{c.toCity}</span>
														</div>
													</div>
													<span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-md border ${badge.cls}`}>{badge.label}</span>
												</div>
											</Link>
											<button
												onClick={() => handleRemoveFromFolder(c.docId)}
												className="shrink-0 p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
												title={t('removeFromFolderButton')}>
												<X className="w-4 h-4" />
											</button>
										</div>
									)
								})}
							</div>
						)}

						{totalPages > 1 && (
							<div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
								<button
									onClick={() => setPage(Math.max(1, currentPage - 1))}
									disabled={currentPage === 1}
									className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 border border-slate-200 hover:border-slate-300 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
									<ChevronLeft className="w-4 h-4" />
								</button>
								<span className="text-xs text-slate-500">
									{tf('pageOf', { page: currentPage, pages: totalPages })}
								</span>
								<button
									onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
									disabled={currentPage === totalPages}
									className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 border border-slate-200 hover:border-slate-300 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
									<ChevronRight className="w-4 h-4" />
								</button>
							</div>
						)}
					</div>
				</div>
			</main>
			</div>

			<DeleteModal
				isOpen={showDeleteModal}
				itemName={folder.name}
				onCancel={() => setShowDeleteModal(false)}
				onConfirm={() => { setShowDeleteModal(false); handleDelete() }}
			/>
		</div>
	)
}
