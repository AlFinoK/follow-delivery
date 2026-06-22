'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Plus, Package, Pencil, Trash2, Bike, Truck, Eye, EyeOff, DownloadCloud, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { ToastItem } from '@/components/Toast'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { PageLoader } from '@/components/PageLoader'
import { Spinner } from '@/components/Spinner'
import { ConfirmModal } from '@/components/admin/ConfirmModal'
import { PresetForm, type PresetFormValues } from '@/components/admin/PresetForm'
import type { Preset } from '@/lib/calculator/presets'
import type { Toast } from '@/components/Toast'

const ru = (n: number) => n.toLocaleString('ru-RU')
const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е').trim()
const PAGE_SIZE = 8

function CatIcon({ category }: { category: string | null }) {
	const cls = 'w-5 h-5 text-orange-500'
	if (category === 'Мото' || category === 'Электро') return <Bike className={cls} />
	if (category === 'Квадроцикл' || category === 'Трицикл') return <Truck className={cls} />
	return <Package className={cls} />
}

export default function PresetsPage() {
	const { t, tf } = useLang()
	const [mounted, setMounted] = useState(false)
	const [minLoadDone, setMinLoadDone] = useState(false)
	const [presets, setPresets] = useState<Preset[]>([])
	const [loading, setLoading] = useState(true)
	const [showCreate, setShowCreate] = useState(false)
	const [editingId, setEditingId] = useState<string | null>(null)
	const [saving, setSaving] = useState(false)
	const [seeding, setSeeding] = useState(false)
	const [deleteId, setDeleteId] = useState<string | null>(null)
	const [query, setQuery] = useState('')
	const [page, setPage] = useState(1)
	const [toasts, setToasts] = useState<Toast[]>([])

	const filtered = useMemo(() => {
		const q = norm(query)
		if (!q) return presets
		return presets.filter((p) => norm(p.name).includes(q) || (p.category ? norm(p.category).includes(q) : false))
	}, [presets, query])
	const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
	const safePage = Math.min(page, pages)
	const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

	const addToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
		const tid = Date.now().toString() + Math.random().toString(36).slice(2, 6)
		setToasts((prev) => [...prev, { id: tid, message, type }])
		setTimeout(() => {
			setToasts((prev) => prev.map((x) => (x.id === tid ? { ...x, exiting: true } : x)))
			setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== tid)), 350)
		}, 5000)
	}, [])

	const loadPresets = useCallback(async () => {
		setLoading(true)
		try {
			const res = await fetch('/api/presets?all=1')
			if (!res.ok) throw new Error()
			setPresets(await res.json())
		} catch {
			addToast(t('loadError'), 'error')
		} finally {
			setLoading(false)
		}
	}, [addToast, t])

	useEffect(() => {
		setMounted(true)
		loadPresets()
		const timer = setTimeout(() => setMinLoadDone(true), 444)
		return () => clearTimeout(timer)
	}, [loadPresets])

	const handleCreate = async (values: PresetFormValues) => {
		setSaving(true)
		try {
			const res = await fetch('/api/presets', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(values),
			})
			if (!res.ok) throw new Error()
			const created: Preset = await res.json()
			setPresets((prev) => [...prev, created].sort((a, b) => a.sortOrder - b.sortOrder))
			setShowCreate(false)
			addToast(t('presetCreated'), 'success')
		} catch {
			addToast(t('presetSaveError'), 'error')
		} finally {
			setSaving(false)
		}
	}

	const handleUpdate = async (id: string, values: PresetFormValues) => {
		setSaving(true)
		try {
			const res = await fetch(`/api/presets/${id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(values),
			})
			if (!res.ok) throw new Error()
			const updated: Preset = await res.json()
			setPresets((prev) => prev.map((p) => (p.id === id ? updated : p)).sort((a, b) => a.sortOrder - b.sortOrder))
			setEditingId(null)
			addToast(t('presetUpdated'), 'success')
		} catch {
			addToast(t('presetSaveError'), 'error')
		} finally {
			setSaving(false)
		}
	}

	const toggleActive = async (p: Preset) => {
		try {
			const res = await fetch(`/api/presets/${p.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ active: !p.active }),
			})
			if (!res.ok) throw new Error()
			const updated: Preset = await res.json()
			setPresets((prev) => prev.map((x) => (x.id === p.id ? updated : x)))
		} catch {
			addToast(t('presetSaveError'), 'error')
		}
	}

	const handleDelete = async () => {
		if (!deleteId) return
		const id = deleteId
		setDeleteId(null)
		try {
			const res = await fetch(`/api/presets/${id}`, { method: 'DELETE' })
			if (!res.ok) throw new Error()
			setPresets((prev) => prev.filter((p) => p.id !== id))
			addToast(t('presetDeleted'), 'success')
		} catch {
			addToast(t('presetDeleteError'), 'error')
		}
	}

	const handleSeed = async () => {
		setSeeding(true)
		try {
			const res = await fetch('/api/presets/seed', { method: 'POST' })
			if (!res.ok) throw new Error()
			const data = await res.json()
			addToast(tf('presetSeedDone', { count: data.seeded ?? 0 }), 'success')
			await loadPresets()
		} catch {
			addToast(t('presetSeedError'), 'error')
		} finally {
			setSeeding(false)
		}
	}

	if (!mounted) return <div suppressHydrationWarning />
	if (!minLoadDone || loading) return <PageLoader />

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
						<div className="bg-white rounded-xl shadow-sm p-5 sm:p-6 border border-slate-200">
							{/* Header */}
							<div className="flex items-center justify-between gap-3 mb-1">
								<div>
									<h2 className="text-lg font-semibold text-slate-900">{t('presetsTitle')}</h2>
									<p className="text-slate-500 text-xs mt-0.5">{tf('totalCount', { total: presets.length })}</p>
								</div>
								<div className="flex items-center gap-2 shrink-0">
									{presets.length === 0 && (
										<button
											onClick={handleSeed}
											disabled={seeding}
											className="inline-flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50">
											{seeding ? <Spinner className="w-4 h-4" /> : <DownloadCloud className="w-4 h-4" />}
											<span className="hidden sm:inline">{t('presetSeedButton')}</span>
										</button>
									)}
									<button
										onClick={() => { setShowCreate((v) => !v); setEditingId(null) }}
										className="inline-flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-lg font-semibold text-sm transition-colors">
										<Plus className="w-4 h-4" />
										<span className="hidden sm:inline">{t('presetAddButton')}</span>
									</button>
								</div>
							</div>

							<p className="text-slate-400 text-xs mb-4">{t('presetsSubtitle')}</p>

							{/* Create form */}
							{showCreate && (
								<div className="mb-5">
									<PresetForm saving={saving} onSubmit={handleCreate} onCancel={() => setShowCreate(false)} />
								</div>
							)}

							{/* Поиск */}
							{presets.length > 0 && (
								<div className="relative mb-4">
									<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
									<input
										type="text"
										value={query}
										onChange={(e) => { setQuery(e.target.value); setPage(1) }}
										placeholder={t('presetSearchPlaceholder')}
										className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all text-sm"
									/>
								</div>
							)}

							{/* List */}
							{presets.length === 0 && !showCreate ? (
								<div className="text-center py-12">
									<Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
									<p className="text-slate-600 font-medium text-sm">{t('presetsEmptyAdmin')}</p>
									<p className="text-slate-400 text-xs mt-1">{t('presetsEmptyHint')}</p>
								</div>
							) : filtered.length === 0 ? (
								<p className="text-center py-10 text-sm text-slate-400">{t('presetNothingFound')}</p>
							) : (
								<div className="space-y-2">
									{pageItems.map((p) =>
										editingId === p.id ? (
											<PresetForm
												key={p.id}
												initial={{
													name: p.name,
													category: p.category ?? '',
													length: p.length,
													width: p.width,
													height: p.height,
													weight: p.weight,
													imageUrl: p.imageUrl ?? '',
													sortOrder: p.sortOrder,
													active: p.active,
												}}
												saving={saving}
												onSubmit={(v) => handleUpdate(p.id, v)}
												onCancel={() => setEditingId(null)}
											/>
										) : (
											<div
												key={p.id}
												className={`bg-white rounded-lg p-3.5 border transition-all ${
													p.active ? 'border-slate-200' : 'border-slate-200 opacity-60'
												}`}>
												<div className="flex items-center justify-between gap-3">
													<div className="flex items-center gap-3 min-w-0 flex-1">
														<div className="w-10 h-10 shrink-0 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center overflow-hidden">
															{p.imageUrl ? (
																// eslint-disable-next-line @next/next/no-img-element
																<img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
															) : (
																<CatIcon category={p.category} />
															)}
														</div>
														<div className="min-w-0 flex-1">
															<div className="flex items-center gap-2">
																<p className="font-semibold text-slate-900 text-sm truncate">{p.name}</p>
																{!p.active && (
																	<span className="shrink-0 text-[10px] font-medium text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">
																		{t('presetHiddenBadge')}
																	</span>
																)}
															</div>
															<p className="text-xs text-slate-500 mt-0.5">
																{ru(p.length)}×{ru(p.width)}×{ru(p.height)} см · {ru(p.weight)} кг
															</p>
														</div>
													</div>
													<div className="flex items-center gap-1 shrink-0">
														<button
															onClick={() => toggleActive(p)}
															title={p.active ? t('presetHideAction') : t('presetShowAction')}
															className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
															{p.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
														</button>
														<button
															onClick={() => { setEditingId(p.id); setShowCreate(false) }}
															title={t('editButton')}
															className="p-2 rounded-lg text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-colors">
															<Pencil className="w-4 h-4" />
														</button>
														<button
															onClick={() => setDeleteId(p.id)}
															title={t('deleteButton')}
															className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
															<Trash2 className="w-4 h-4" />
														</button>
													</div>
												</div>
											</div>
										)
									)}

									{/* Пагинация */}
									{pages > 1 && (
										<div className="flex items-center justify-center gap-3 pt-3">
											<button
												type="button"
												aria-label="prev"
												disabled={safePage <= 1}
												onClick={() => setPage(Math.max(1, safePage - 1))}
												className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
												<ChevronLeft className="w-4 h-4" />
											</button>
											<span className="text-xs text-slate-500">{tf('pageOf', { page: safePage, pages })}</span>
											<button
												type="button"
												aria-label="next"
												disabled={safePage >= pages}
												onClick={() => setPage(Math.min(pages, safePage + 1))}
												className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
												<ChevronRight className="w-4 h-4" />
											</button>
										</div>
									)}
								</div>
							)}
						</div>
					</div>
				</main>
				<footer className="text-center text-slate-400 text-xs py-4 px-4">{t('adminFooter')}</footer>
			</div>

			<ConfirmModal
				isOpen={deleteId !== null}
				title={t('presetDeleteTitle')}
				description={t('presetConfirmDelete')}
				confirmLabel={t('deleteButton')}
				cancelLabel={t('cancelButton')}
				onConfirm={handleDelete}
				onCancel={() => setDeleteId(null)}
				tone="danger"
			/>
		</div>
	)
}
