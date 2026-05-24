'use client'

import { use, useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLang } from '@/contexts/LangContext'
import { ToastItem } from '@/components/Toast'
import { AdminNav } from '@/components/admin/AdminNav'
import { DeleteModal } from '@/components/admin/DeleteModal'
import { PageLoader } from '@/components/PageLoader'
import { Spinner } from '@/components/Spinner'
import { CitySelect, StatusSelect } from '@/components/admin/Selects'
import type { Toast } from '@/components/Toast'
import type { Cargo } from '@/components/admin/types'

interface FolderDetail {
	id: string
	name: string
	createdAt: string
	updatedAt: string
	cargos: Cargo[]
}

function getStatusBadge(status: string, t: (k: any) => string) {
	if (status === 'в пути') return { label: t('statusInTransit'), cls: 'bg-blue-100 text-blue-700 border-blue-200' }
	if (status === 'прибыл') return { label: t('statusArrived'), cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
	return { label: t('statusWaiting'), cls: 'bg-amber-100 text-amber-700 border-amber-200' }
}

type CargoTab = 'active' | 'delivered' | 'all'

export default function FolderDetailPage({ params }: { params: Promise<{ id: string }> }) {
	const { id: folderId } = use(params)
	const { t, tf } = useLang()
	const router = useRouter()

	const [mounted, setMounted] = useState(false)
	const [minLoadDone, setMinLoadDone] = useState(false)
	const [folder, setFolder] = useState<FolderDetail | null>(null)
	const [loading, setLoading] = useState(true)
	const [toasts, setToasts] = useState<Toast[]>([])

	// rename
	const [renaming, setRenaming] = useState(false)
	const [renameValue, setRenameValue] = useState('')
	const [savingName, setSavingName] = useState(false)

	// delete
	const [showDeleteModal, setShowDeleteModal] = useState(false)

	// add cargos
	const [addInput, setAddInput] = useState('')
	const [adding, setAdding] = useState(false)

	// bulk update
	const [bulkCity, setBulkCity] = useState('')
	const [bulkStatus, setBulkStatus] = useState('')
	const [bulkUpdating, setBulkUpdating] = useState(false)

	// tab
	const [tab, setTab] = useState<CargoTab>('active')

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
			const res = await fetch(`/api/folders/${folderId}`)
			if (res.status === 404) { router.push('/admin/folders'); return }
			if (!res.ok) throw new Error()
			setFolder(await res.json())
		} catch {
			addToast(t('loadError'), 'error')
		} finally {
			if (!silent) setLoading(false)
		}
	}, [folderId, router, addToast, t])

	useEffect(() => {
		setMounted(true)
		loadFolder()
		const timer = setTimeout(() => setMinLoadDone(true), 444)
		return () => clearTimeout(timer)
	}, [loadFolder])

	const activeCount = useMemo(() => folder?.cargos.filter((c) => c.status !== 'прибыл').length ?? 0, [folder])
	const deliveredCount = useMemo(() => folder?.cargos.filter((c) => c.status === 'прибыл').length ?? 0, [folder])

	const visibleCargos = useMemo(() => {
		if (!folder) return []
		if (tab === 'active') return folder.cargos.filter((c) => c.status !== 'прибыл')
		if (tab === 'delivered') return folder.cargos.filter((c) => c.status === 'прибыл')
		return folder.cargos
	}, [folder, tab])

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
			setFolder({ ...folder, name })
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
			const data: { added: number[]; notFound: number[]; alreadyDelivered: number[]; alreadyInFolder: number[]; movedFromOtherFolder: number[] } = await res.json()
			if (data.added.length > 0) addToast(tf('cargosAddedToast', { count: data.added.length }), 'success')
			if (data.movedFromOtherFolder.length > 0) addToast(tf('cargosMovedToast', { numbers: data.movedFromOtherFolder.join(', ') }), 'success')
			if (data.alreadyInFolder.length > 0) addToast(tf('cargosAlreadyInFolderToast', { numbers: data.alreadyInFolder.join(', ') }), 'error')
			if (data.notFound.length > 0) addToast(tf('cargosNotFoundToast', { numbers: data.notFound.join(', ') }), 'error')
			if (data.alreadyDelivered.length > 0) addToast(tf('cargosAlreadyDeliveredToast', { numbers: data.alreadyDelivered.join(', ') }), 'error')
			setAddInput('')
			if (data.added.length > 0 || data.movedFromOtherFolder.length > 0) await loadFolder(true)
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
			const data: { updated: number } = await res.json()
			addToast(tf('bulkUpdatedToast', { count: data.updated }), 'success')
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
		<div
			className="min-h-screen flex flex-col bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50"
			suppressHydrationWarning>
			<div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-xs">
				{toasts.map((toast) => (
					<ToastItem key={toast.id} toast={toast} />
				))}
			</div>

			<AdminNav />

			<main className="flex-1 p-4 sm:p-6 pb-12">
				<div className="max-w-4xl mx-auto">
					{/* Back + title */}
					<div className="flex items-center justify-between gap-3 mb-6">
						<button
							onClick={() => router.push('/admin/folders')}
							className="flex items-center gap-1.5 text-orange-600 hover:text-orange-700 font-semibold text-sm transition-colors flex-shrink-0">
							<svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
								<path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
							</svg>
							{t('backToList')}
						</button>
						<div className="flex items-center gap-2">
							<span className="text-xl">🗂️</span>
							<h1 className="text-xl font-black text-gray-900">{t('foldersNavLink')}</h1>
						</div>
					</div>

					{/* Header card: name + counts + actions */}
					<div className="bg-white rounded-2xl shadow-lg border border-orange-100 mb-5">
						<div className="h-1.5 rounded-t-2xl bg-gradient-to-r from-amber-400 to-orange-500" />
						<div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-start gap-4">
							<div className="flex-1 min-w-0">
								{renaming ? (
									<div className="flex gap-2">
										<input
											type="text"
											value={renameValue}
											onChange={(e) => setRenameValue(e.target.value)}
											autoFocus
											className="flex-1 px-3 py-2 text-sm font-bold text-gray-900 bg-gray-50 border border-orange-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-400/30 rounded-xl outline-none transition-all"
										/>
										<button
											onClick={saveRename}
											disabled={savingName}
											className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white rounded-xl text-sm font-bold transition-all border border-transparent">
											{savingName ? '...' : t('saveFolderName')}
										</button>
										<button
											onClick={cancelRename}
											className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-bold transition-colors border border-transparent">
											✕
										</button>
									</div>
								) : (
									<h2 className="text-xl sm:text-2xl font-black text-gray-900 break-words">{folder.name}</h2>
								)}
								<div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
									<span className="text-orange-600 font-semibold">{tf('folderActiveCount', { count: activeCount })}</span>
									<span className="text-gray-500">{tf('folderTotalCargos', { count: folder.cargos.length })}</span>
								</div>
							</div>
							<div className="flex gap-2 flex-shrink-0">
								{!renaming && (
									<button
										onClick={startRename}
										className="px-3 py-2 text-sm font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl transition-colors">
										✎ {t('renameFolderButton')}
									</button>
								)}
								<button
									onClick={() => setShowDeleteModal(true)}
									className="px-3 py-2 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors">
									{t('deleteButton')}
								</button>
							</div>
						</div>
					</div>

					{/* Add cargos by numbers */}
					<div className="bg-white rounded-2xl shadow-lg border border-orange-100 p-5 sm:p-6 mb-5">
						<p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">{t('addCargosTitle')}</p>
						<p className="text-xs text-gray-500 mb-3">{t('addCargosHint')}</p>
						<form onSubmit={handleAddCargos} className="flex flex-col sm:flex-row gap-2">
							<input
								type="text"
								value={addInput}
								onChange={(e) => setAddInput(e.target.value)}
								placeholder={t('addCargosPlaceholder')}
								className="flex-1 px-4 py-2.5 bg-gray-50 border-2 border-orange-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-400/30 transition-all text-sm font-medium"
							/>
							<button
								type="submit"
								disabled={adding || !addInput.trim()}
								className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl hover:shadow-lg disabled:opacity-50 transition-all text-sm">
								{adding ? <Spinner /> : t('addCargosButton')}
							</button>
						</form>
					</div>

					{/* Bulk update */}
					<div className="bg-white rounded-2xl shadow-lg border border-orange-100 p-5 sm:p-6 mb-5">
						<p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">{t('bulkUpdateTitle')}</p>
						<p className="text-xs text-gray-500 mb-3">{t('bulkUpdateHint')}</p>
						<form onSubmit={handleBulkUpdate} className="flex flex-col gap-3">
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
								<div>
									<p className="text-orange-600 text-xs font-bold mb-2 tracking-wide">{t('currentLocationLabel')}</p>
									<CitySelect value={bulkCity} onChange={setBulkCity} placeholder={t('selectCity')} />
								</div>
								<div>
									<p className="text-orange-600 text-xs font-bold mb-2 tracking-wide">{t('statusCardLabel')}</p>
									<StatusSelect value={bulkStatus || 'ожидает отправления'} onChange={setBulkStatus} />
								</div>
							</div>
							<button
								type="submit"
								disabled={bulkUpdating || (!bulkCity.trim() && !bulkStatus)}
								className="self-end px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl hover:shadow-lg disabled:opacity-50 transition-all text-sm">
								{bulkUpdating ? <Spinner /> : t('bulkUpdateButton')}
							</button>
						</form>
					</div>

					{/* Cargos */}
					<div className="bg-white rounded-2xl shadow-lg border border-orange-100 p-5 sm:p-6">
						<div className="flex items-center gap-3 mb-4">
							<span className="text-2xl">📦</span>
							<h3 className="text-lg font-black text-gray-900">{t('cargosTitle')}</h3>
						</div>

						{/* Tabs */}
						<div className="flex flex-wrap gap-2 mb-4">
							{([
								{ key: 'active' as const, label: t('folderTabActive'), count: activeCount, active: 'bg-orange-500 text-white border-orange-500', countCls: 'bg-orange-100 text-orange-600' },
								{ key: 'delivered' as const, label: t('folderTabDelivered'), count: deliveredCount, active: 'bg-emerald-500 text-white border-emerald-500', countCls: 'bg-emerald-100 text-emerald-700' },
								{ key: 'all' as const, label: t('folderTabAll'), count: folder.cargos.length, active: 'bg-gray-500 text-white border-gray-500', countCls: 'bg-gray-100 text-gray-600' },
							]).map((tt) => {
								const isActive = tab === tt.key
								return (
									<button
										key={tt.key}
										onClick={() => setTab(tt.key)}
										className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
											isActive ? tt.active : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300 hover:text-orange-600'
										}`}>
										{tt.label}
										<span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/25 text-white' : tt.countCls}`}>
											{tt.count}
										</span>
									</button>
								)
							})}
						</div>

						{visibleCargos.length === 0 ? (
							<div className="text-center py-8">
								<p className="text-3xl mb-2">📭</p>
								<p className="text-gray-500 text-sm">{t('folderEmptyCargos')}</p>
							</div>
						) : (
							<div className="space-y-2.5">
								{visibleCargos.map((c) => {
									const badge = getStatusBadge(c.status, t)
									return (
										<div
											key={c.docId}
											className="flex items-center gap-3 bg-gray-50 border border-orange-100 rounded-xl p-3 sm:p-4 hover:border-orange-300 transition-all">
											<Link
												href={`/admin/cargo/${c.docId}?returnTo=${encodeURIComponent(`/admin/folders/${folder.id}`)}`}
												className="flex-1 min-w-0 group">
												<div className="flex items-center gap-2">
													<div className="flex-1 min-w-0">
														<p className="font-bold text-gray-900 text-sm truncate group-hover:text-orange-600 transition-colors">
															{c.cargoNumber != null && <span className="text-orange-500 mr-1.5">№{c.cargoNumber}</span>}
															{c.name || <span className="text-gray-400 italic">{t('noName')}</span>}
														</p>
														<p className="text-[11px] text-gray-500 mt-0.5 truncate">
															📤 {c.fromCity} › 📍 {c.currentCity} › 📥 {c.toCity}
														</p>
													</div>
													<span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.cls}`}>{badge.label}</span>
												</div>
											</Link>
											<button
												onClick={() => handleRemoveFromFolder(c.docId)}
												className="shrink-0 px-2.5 py-1 text-[11px] font-bold text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
												title={t('removeFromFolderButton')}>
												✕
											</button>
										</div>
									)
								})}
							</div>
						)}
					</div>
				</div>
			</main>

			<DeleteModal
				isOpen={showDeleteModal}
				itemName={folder.name}
				onCancel={() => setShowDeleteModal(false)}
				onConfirm={() => { setShowDeleteModal(false); handleDelete() }}
			/>
		</div>
	)
}
