'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, FileDown, FileText, Inbox, Plus, Search, SearchX, X } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { repos } from '@/lib/data/repos'
import type { WaybillDTO, WaybillsResponse } from '@/lib/data/types'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { PageLoader } from '@/components/PageLoader'
import { Spinner } from '@/components/Spinner'
import { ToastItem, type Toast } from '@/components/Toast'
import { openWaybillPrint } from '@/lib/waybill/print'
import { fmtMoney, totalWeight, type WaybillStatus } from '@/lib/waybill/model'
import { STATUS_KEYS, STATUS_ORDER } from '@/lib/waybill/statusI18n'

// Список сохранённых накладных (ПРАВКИ 2, п.6 — «непонятно, где хранятся накладные»).
// Отсюда накладная открывается на редактирование: /admin/waybills/[id].

type Tab = 'all' | WaybillStatus

const TABS: Tab[] = ['all', ...STATUS_ORDER]

const BADGE: Record<WaybillStatus, string> = {
	draft: 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-700',
	active: 'bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/25',
	delivered: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/25',
	cancelled: 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/25',
}

const ru = (date: string) => {
	if (!date) return '—'
	const [y, m, d] = date.split('-')
	return y && m && d ? `${d}.${m}.${y}` : date
}

export function WaybillsListPage() {
	const { t, tf } = useLang()
	const repo = repos
	const [mounted, setMounted] = useState(false)
	const [minLoadDone, setMinLoadDone] = useState(false)
	const [data, setData] = useState<WaybillsResponse | null>(null)
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)
	const [tab, setTab] = useState<Tab>('all')
	const [page, setPage] = useState(1)
	const [search, setSearch] = useState('')
	const [query, setQuery] = useState('')
	const [toasts, setToasts] = useState<Toast[]>([])

	const addToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
		const id = `${Date.now()}-${Math.random()}`
		setToasts((prev) => [...prev, { id, message, type }])
		setTimeout(() => setToasts((prev) => prev.filter((tt) => tt.id !== id)), 4000)
	}, [])

	useEffect(() => {
		setMounted(true)
		const timer = setTimeout(() => setMinLoadDone(true), 444)
		// Тост, перенесённый с другой страницы (например, после удаления накладной).
		const pending = sessionStorage.getItem('pendingToast')
		if (pending) {
			sessionStorage.removeItem('pendingToast')
			try {
				const { message, type } = JSON.parse(pending) as { message: string; type?: 'success' | 'error' }
				addToast(message, type ?? 'success')
			} catch {
				/* битый JSON — игнорируем */
			}
		}
		return () => clearTimeout(timer)
	}, [addToast])

	// Дебаунс поискового ввода
	useEffect(() => {
		if (search === query) return
		const timer = setTimeout(() => {
			setQuery(search)
			setPage(1)
		}, 300)
		return () => clearTimeout(timer)
	}, [search, query])

	const load = useCallback(
		async (silent: boolean) => {
			if (silent) setRefreshing(true)
			else setLoading(true)
			try {
				setData(await repo.waybills.list({ status: tab, q: query, page }))
			} catch {
				addToast(t('wlLoadError'), 'error')
			} finally {
				setLoading(false)
				setRefreshing(false)
			}
		},
		[repo, tab, query, page, addToast]
	)

	useEffect(() => {
		if (!mounted) return
		void load(data != null)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [mounted, tab, query, page])

	if (!mounted) return <div suppressHydrationWarning />
	if (!minLoadDone) return <PageLoader />

	const counts = data?.counts ?? { all: 0, draft: 0, active: 0, delivered: 0, cancelled: 0 }
	const items = data?.items ?? []
	const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1
	const currentPage = Math.min(page, totalPages)
	const hasFilter = tab !== 'all' || query.trim().length > 0

	return (
		<div
			className="min-h-screen bg-slate-50 dark:bg-zinc-950"
			suppressHydrationWarning>
			<AdminSidebar />

			<div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
				{toasts.map((tt) => (
					<ToastItem
						key={tt.id}
						toast={tt}
					/>
				))}
			</div>

			<div className="lg:ml-64 min-h-screen flex flex-col">
				<main className="flex-1 p-4 sm:p-6 pb-12">
					<div className="max-w-4xl mx-auto">
						<div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm p-5 sm:p-6 border border-slate-200 dark:border-zinc-700">
							{/* Header */}
							<div className="flex items-center justify-between gap-3 mb-4">
								<div className="min-w-0">
									<div className="flex items-center gap-2">
										<h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">{t('waybillsNavLink')}</h2>
										{refreshing && <Spinner className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />}
									</div>
									<p className="text-slate-500 dark:text-zinc-400 text-xs mt-0.5">
										{hasFilter ? tf('foundCount', { found: data?.total ?? 0, total: counts.all }) : tf('totalCount', { total: counts.all })}
									</p>
								</div>
								<Link
									href={`/admin/waybills/new`}
									className="inline-flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-lg font-semibold text-sm transition-colors shrink-0">
									<Plus className="w-4 h-4" />
									<span className="hidden sm:inline">{t('createWaybillButton')}</span>
								</Link>
							</div>

							{/* Search */}
							<div className="relative mb-3">
								<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500 pointer-events-none" />
								<input
									type="text"
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									placeholder={t('wlSearchPh')}
									className="w-full pl-9 pr-9 py-2 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all text-sm"
								/>
								{search && (
									<button
										onClick={() => setSearch('')}
										className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 dark:text-zinc-500 hover:text-slate-600 transition-colors">
										<X className="w-3.5 h-3.5" />
									</button>
								)}
							</div>

							{/* Tabs */}
							<div className="flex flex-wrap gap-1.5 mb-5">
								{TABS.map((key) => {
									const active = tab === key
									return (
										<button
											key={key}
											onClick={() => {
												setTab(key)
												setPage(1)
											}}
											className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-all ${
												active
													? 'bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-500/25'
													: 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-600 hover:text-slate-900 dark:hover:text-white'
											}`}>
											{key === 'all' ? t('filterAll') : t(STATUS_KEYS[key])}
											<span
												className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
													active
														? 'bg-orange-100 dark:bg-orange-500/15 text-orange-700 dark:text-orange-300'
														: 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400'
												}`}>
												{counts[key]}
											</span>
										</button>
									)
								})}
							</div>

							{/* List */}
							{loading ? (
								<div className="flex items-center justify-center py-12">
									<Spinner className="w-5 h-5 text-orange-500" />
								</div>
							) : counts.all === 0 ? (
								<div className="text-center py-12">
									<Inbox className="w-10 h-10 text-slate-300 dark:text-zinc-600 mx-auto mb-3" />
									<p className="text-slate-600 dark:text-zinc-300 font-medium text-sm">{t('wlEmpty')}</p>
									<p className="text-slate-400 dark:text-zinc-500 text-xs mt-1">{t('wlEmptyHint')}</p>
								</div>
							) : items.length === 0 ? (
								<div className="text-center py-12">
									<SearchX className="w-10 h-10 text-slate-300 dark:text-zinc-600 mx-auto mb-3" />
									<p className="text-slate-600 dark:text-zinc-300 font-medium text-sm">{t('nothingFound')}</p>
									<p className="text-slate-400 dark:text-zinc-500 text-xs mt-1">{t('tryAnotherQuery')}</p>
								</div>
							) : (
								<>
									<div className="space-y-2">
										{items.map((w) => (
											<WaybillRow
												key={w.docId}
												waybill={w}
												href={`/admin/waybills/${w.docId}`}
											/>
										))}
									</div>

									{totalPages > 1 && (
										<div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-200 dark:border-zinc-700">
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
												disabled={currentPage >= totalPages}
												className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-600 hover:text-slate-900 dark:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all">
												<ChevronRight className="w-4 h-4" />
											</button>
										</div>
									)}
								</>
							)}
						</div>
					</div>
				</main>
				<footer className="text-center text-slate-400 dark:text-zinc-500 text-xs py-4 px-4">{t('adminFooter')}</footer>
			</div>
		</div>
	)
}

function WaybillRow({ waybill: w, href }: { waybill: WaybillDTO; href: string }) {
	const { t, tf } = useLang()
	const weight = totalWeight(w.positions)
	return (
		<div className="group relative rounded-xl border border-slate-200 dark:border-zinc-700 hover:border-orange-300 dark:hover:border-orange-500/40 bg-white dark:bg-zinc-900 transition-colors">
			<Link
				href={href}
				className="block p-3.5">
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0">
						<div className="flex items-center gap-2 flex-wrap">
							<span className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-zinc-100">
								<FileText className="w-4 h-4 text-orange-500" />№{w.number}
							</span>
							<span className={`text-[11px] font-medium px-1.5 py-0.5 rounded border ${BADGE[w.status]}`}>
								{t(STATUS_KEYS[w.status])}
							</span>
							{w.nature && <span className="text-xs text-slate-500 dark:text-zinc-400 truncate">{w.nature}</span>}
						</div>
						<p className="text-[13px] text-slate-700 dark:text-zinc-200 mt-1.5 truncate">
							{w.sender.fullName || '—'} <span className="text-slate-400 dark:text-zinc-500">→</span> {w.receiver.fullName || '—'}
						</p>
						<p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 truncate">
							{w.sender.city || '—'} → {w.receiver.city || '—'} · {tf('wlAccepted', { date: ru(w.acceptanceDate) })}
							{weight > 0 && ` · ${weight.toFixed(1).replace('.', ',')} ${t('calcKg')}`}
						</p>
					</div>
					<div className="text-right shrink-0">
						<p className="text-sm font-bold text-slate-900 dark:text-zinc-100">{fmtMoney(w.amount)} ₸</p>
						<p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5">
							{w.payer === 'sender' ? t('wlPayerSender') : t('wlPayerReceiver')}
						</p>
					</div>
				</div>
			</Link>
			<button
				type="button"
				onClick={() => openWaybillPrint(w)}
				title={t('wpDownloadPdf')}
				aria-label={tf('wlPdfAria', { number: w.number })}
				className="absolute bottom-2.5 right-2.5 p-1.5 rounded-lg text-slate-400 dark:text-zinc-500 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors">
				<FileDown className="w-4 h-4" />
			</button>
		</div>
	)
}
