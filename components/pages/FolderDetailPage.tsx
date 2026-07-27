'use client'

import { useState, useEffect, useCallback } from 'react'
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
import { repos } from '@/lib/data/repos'
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
	if (status === 'в пути') return { label: t('statusInTransit'), cls: 'bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/25' }
	if (status === 'прибыл') return { label: t('statusArrived'), cls: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/25' }
	return { label: t('statusWaiting'), cls: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/25' }
}

type CargoTab = 'active' | 'delivered' | 'all'

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
	<p className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-3">{children}</p>
)

export function FolderDetailPage({ id: folderId }: { id: string }) {
	const { t, tf } = useLang()
	const router = useRouter()
	const repo = repos

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
			const result = await repo.folders.get(folderId, { tab, page })
			if (result === null) { router.push(`/admin/folders`); return }
			setData(result)
		} catch {
			addToast(t('loadError'), 'error')
		} finally {
			if (!silent) setLoading(false)
		}
	}, [folderId, router, addToast, t, tab, page, repo])

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
			await repo.folders.rename(folder.id, name)
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
			await repo.folders.remove(folder.id)
			sessionStorage.setItem('pendingToast', JSON.stringify({ message: t('folderDeleted'), type: 'success' }))
			router.push(`/admin/folders`)
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
			const result = await repo.folders.addCargos(folder.id, numbers)
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
		const body: { currentCity?: string; status?: string } = {}
		if (bulkCity.trim()) body.currentCity = bulkCity.trim()
		if (bulkStatus) body.status = bulkStatus
		if (Object.keys(body).length === 0) { addToast(t('bulkNothingToUpdate'), 'error'); return }
		setBulkUpdating(true)
		try {
			const result = await repo.folders.bulkUpdate(folder.id, body)
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
			await repo.cargos.update(docId, { folderId: null })
			await loadFolder(true)
		} catch {
			addToast(t('removeFromFolderError'), 'error')
		}
	}

	if (!mounted) return <div suppressHydrationWarning />
	if (!minLoadDone || loading) return <PageLoader />
	if (!folder) return null

	return (
		<div className="min-h-screen bg-slate-50 dark:bg-zinc-950" suppressHydrationWarning>
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
							onClick={() => router.push(`/admin/folders`)}
							className="inline-flex items-center gap-1.5 text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white font-medium text-sm transition-colors">
							<ArrowLeft className="w-4 h-4" />
							{t('backToList')}
						</button>
						<h1 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">{t('foldersNavLink')}</h1>
					</div>

					<div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-slate-200 dark:border-zinc-700 mb-4">
						<div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-start gap-3">
							<div className="flex-1 min-w-0">
								{renaming ? (
									<div className="flex gap-2">
										<input
											type="text"
											value={renameValue}
											onChange={(e) => setRenameValue(e.target.value)}
											autoFocus
											className="flex-1 px-3 py-2 text-sm font-medium text-slate-900 dark:text-zinc-100 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 rounded-lg outline-none transition-all"
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
											className="inline-flex items-center justify-center px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800/60 text-slate-700 dark:text-zinc-200 rounded-lg text-sm font-semibold transition-colors">
											<X className="w-4 h-4" />
										</button>
									</div>
								) : (
									<h2 className="text-xl font-semibold text-slate-900 dark:text-zinc-100 break-words">{folder.name}</h2>
								)}
								<div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs">
									<span className="text-orange-600 dark:text-orange-400 font-medium">{tf('folderActiveCount', { count: counts.active })}</span>
									<span className="text-slate-500 dark:text-zinc-400">{tf('folderTotalCargos', { count: counts.all })}</span>
								</div>
							</div>
							<div className="flex gap-2 shrink-0">
								{!renaming && (
									<button
										onClick={startRename}
										className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-zinc-200 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 rounded-lg transition-colors">
										<Pencil className="w-3.5 h-3.5" />
										{t('renameFolderButton')}
									</button>
								)}
								<button
									onClick={() => setShowDeleteModal(true)}
									className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-red-600 dark:text-red-300 bg-white dark:bg-zinc-900 hover:bg-red-50 dark:hover:bg-red-500/15 border border-slate-200 dark:border-zinc-700 hover:border-red-200 dark:hover:border-red-500/25 rounded-lg transition-colors">
									<Trash2 className="w-3.5 h-3.5" />
									{t('deleteButton')}
								</button>
							</div>
						</div>
					</div>

					<div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-slate-200 dark:border-zinc-700 p-5 sm:p-6 mb-4">
						<SectionTitle>{t('addCargosTitle')}</SectionTitle>
						<p className="text-xs text-slate-500 dark:text-zinc-400 mb-3">{t('addCargosHint')}</p>
						<form onSubmit={handleAddCargos} className="flex flex-col sm:flex-row gap-2">
							<input
								type="text"
								value={addInput}
								onChange={(e) => setAddInput(e.target.value)}
								placeholder={t('addCargosPlaceholder')}
								className="flex-1 px-3 py-2 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all text-sm font-medium"
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

					<div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-slate-200 dark:border-zinc-700 p-5 sm:p-6 mb-4">
						<SectionTitle>{t('bulkUpdateTitle')}</SectionTitle>
						<p className="text-xs text-slate-500 dark:text-zinc-400 mb-3">{t('bulkUpdateHint')}</p>
						<form onSubmit={handleBulkUpdate} className="flex flex-col gap-3">
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
								<div>
									<p className="text-xs font-medium text-slate-700 dark:text-zinc-200 mb-1.5">{t('currentLocationLabel')}</p>
									<CitySelect value={bulkCity} onChange={setBulkCity} placeholder={t('selectCity')} />
								</div>
								<div>
									<p className="text-xs font-medium text-slate-700 dark:text-zinc-200 mb-1.5">{t('statusCardLabel')}</p>
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

					<div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-slate-200 dark:border-zinc-700 p-5 sm:p-6">
						<div className="flex items-center justify-between gap-3 mb-4">
							<h3 className="text-base font-semibold text-slate-900 dark:text-zinc-100">{t('cargosTitle')}</h3>
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
												: 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-600 hover:text-slate-900 dark:hover:text-white'
										}`}>
										{tt.label}
										<span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${isActive ? 'bg-white/15 text-white' : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400'}`}>
											{tt.count}
										</span>
									</button>
								)
							})}
						</div>

						{items.length === 0 ? (
							<div className="text-center py-8">
								<Package className="w-8 h-8 text-slate-300 dark:text-zinc-600 mx-auto mb-2" />
								<p className="text-slate-500 dark:text-zinc-400 text-sm">{t('folderEmptyCargos')}</p>
							</div>
						) : (
							<div className="space-y-2">
								{items.map((c) => {
									const badge = getStatusBadge(c.status, t)
									return (
										<div
											key={c.docId}
											className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg p-3 hover:border-slate-300 dark:hover:border-zinc-600 transition-all">
											<Link
												href={`/admin/cargo/${c.docId}?returnTo=${encodeURIComponent(`/admin/folders/${folder.id}`)}`}
												className="flex-1 min-w-0 group">
												<div className="flex items-center gap-2">
													<div className="flex-1 min-w-0">
														<p className="font-semibold text-slate-900 dark:text-zinc-100 text-sm truncate group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
															{c.cargoNumber != null && <span className="text-orange-600 dark:text-orange-400 mr-1.5">№{c.cargoNumber}</span>}
															{c.name || <span className="text-slate-400 dark:text-zinc-500 italic">{t('noName')}</span>}
														</p>
														<div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 truncate">
															<Package className="w-3 h-3 shrink-0" />
															<span className="truncate">{c.fromCity}</span>
															<ArrowRight className="w-2.5 h-2.5 shrink-0" />
															<MapPin className="w-3 h-3 text-orange-500 shrink-0" />
															<span className="text-slate-700 dark:text-zinc-200 font-medium truncate">{c.currentCity}</span>
															<ArrowRight className="w-2.5 h-2.5 shrink-0" />
															<span className="truncate">{c.toCity}</span>
														</div>
													</div>
													<span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-md border ${badge.cls}`}>{badge.label}</span>
												</div>
											</Link>
											<button
												onClick={() => handleRemoveFromFolder(c.docId)}
												className="shrink-0 p-1.5 text-slate-400 dark:text-zinc-500 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/15 rounded-md transition-colors"
												title={t('removeFromFolderButton')}>
												<X className="w-4 h-4" />
											</button>
										</div>
									)
								})}
							</div>
						)}

						{totalPages > 1 && (
							<div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200 dark:border-zinc-700">
								<button
									onClick={() => setPage(Math.max(1, currentPage - 1))}
									disabled={currentPage === 1}
									className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-600 hover:text-slate-900 dark:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all">
									<ChevronLeft className="w-4 h-4" />
								</button>
								<span className="text-xs text-slate-500 dark:text-zinc-400">
									{tf('pageOf', { page: currentPage, pages: totalPages })}
								</span>
								<button
									onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
									disabled={currentPage === totalPages}
									className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-600 hover:text-slate-900 dark:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all">
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
