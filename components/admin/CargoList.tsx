'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Plus, Search, X, ChevronLeft, ChevronRight, Inbox, SearchX } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { Spinner } from '@/components/Spinner'
import { CargoListCard } from './CargoListCard'
import { CargoSkeleton } from './CargoSkeleton'
import type { Cargo } from './types'

type StatusKey = 'all' | 'waiting' | 'transit' | 'arrived'

interface CargosResponse {
	items: Cargo[]
	total: number
	page: number
	pageSize: number
	counts: { all: number; waiting: number; transit: number; arrived: number }
}

interface CargoListProps {
	onError: (message: string) => void
}

export function CargoList({ onError }: CargoListProps) {
	const { t, tf } = useLang()
	const router = useRouter()
	const pathname = usePathname()
	const searchParams = useSearchParams()

	const urlSearchQuery = searchParams.get('q') ?? ''
	const rawStatus = searchParams.get('status')
	const statusFilter: StatusKey =
		rawStatus === 'waiting' || rawStatus === 'transit' || rawStatus === 'arrived' ? rawStatus : 'all'
	const page = Math.max(1, Number(searchParams.get('page')) || 1)

	// Локальный input для дебаунса — чтобы каждое нажатие не дёргало URL/запрос.
	const [searchInput, setSearchInput] = useState(urlSearchQuery)
	useEffect(() => { setSearchInput(urlSearchQuery) }, [urlSearchQuery])

	const [data, setData] = useState<CargosResponse | null>(null)
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)

	const updateParams = useCallback((updates: Record<string, string | null>) => {
		const params = new URLSearchParams(searchParams.toString())
		for (const [k, v] of Object.entries(updates)) {
			if (v === null || v === '') params.delete(k)
			else params.set(k, v)
		}
		const qs = params.toString()
		router.replace(qs ? `${pathname}?${qs}` : pathname)
	}, [pathname, router, searchParams])

	const fetchPage = useCallback(async (silent = false) => {
		if (!silent) setLoading(true)
		else setRefreshing(true)
		try {
			const params = new URLSearchParams()
			if (statusFilter !== 'all') params.set('status', statusFilter)
			if (urlSearchQuery.trim()) params.set('q', urlSearchQuery.trim())
			if (page > 1) params.set('page', String(page))
			const res = await fetch(`/api/cargos?${params.toString()}`)
			if (!res.ok) throw new Error()
			setData(await res.json())
		} catch {
			onError(t('loadError'))
		} finally {
			if (!silent) setLoading(false)
			else setRefreshing(false)
		}
	}, [statusFilter, urlSearchQuery, page, onError, t])

	useEffect(() => { void fetchPage(data != null) /* первый раз — c лоадером, потом silent */ // eslint-disable-next-line react-hooks/exhaustive-deps
	}, [statusFilter, urlSearchQuery, page])

	// Дебаунс ввода поиска в URL
	useEffect(() => {
		if (searchInput === urlSearchQuery) return
		const t = setTimeout(() => updateParams({ q: searchInput, page: null }), 300)
		return () => clearTimeout(t)
	}, [searchInput, urlSearchQuery, updateParams])

	const handleFilterChange = (key: StatusKey) => {
		updateParams({ status: key === 'all' ? null : key, page: null })
	}

	const setPage = (p: number) => {
		updateParams({ page: p === 1 ? null : String(p) })
	}

	const filterLabels: Record<StatusKey, string> = {
		all: t('filterAll'),
		waiting: t('statusWaiting'),
		transit: t('statusInTransit'),
		arrived: t('statusArrived'),
	}

	const filterColors: Record<StatusKey, { tab: string; count: string }> = {
		all: { tab: 'bg-slate-100 text-slate-900 border-slate-300', count: 'bg-slate-200 text-slate-700' },
		waiting: { tab: 'bg-amber-50 text-amber-700 border-amber-200', count: 'bg-amber-100 text-amber-700' },
		transit: { tab: 'bg-blue-50 text-blue-700 border-blue-200', count: 'bg-blue-100 text-blue-700' },
		arrived: { tab: 'bg-emerald-50 text-emerald-700 border-emerald-200', count: 'bg-emerald-100 text-emerald-700' },
	}

	const counts = data?.counts ?? { all: 0, waiting: 0, transit: 0, arrived: 0 }
	const total = data?.total ?? 0
	const items = data?.items ?? []
	const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1
	const currentPage = Math.min(page, totalPages)
	const hasFilter = statusFilter !== 'all' || urlSearchQuery.trim().length > 0

	return (
		<div className="bg-white rounded-xl shadow-sm p-5 sm:p-6 border border-slate-200">
			{/* Header */}
			<div className="flex items-center justify-between gap-3 mb-4">
				<div className="min-w-0">
					<div className="flex items-center gap-2">
						<h2 className="text-lg font-semibold text-slate-900">{t('cargosTitle')}</h2>
						{refreshing && <Spinner className="w-3.5 h-3.5 text-slate-400" />}
					</div>
					<p className="text-slate-500 text-xs mt-0.5">
						{hasFilter
							? tf('foundCount', { found: total, total: counts.all })
							: tf('totalCount', { total: counts.all })}
					</p>
				</div>
				<button
					onClick={() => router.push('/admin/cargo/new')}
					className="inline-flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-lg font-semibold text-sm transition-colors shrink-0">
					<Plus className="w-4 h-4" />
					<span className="hidden sm:inline">{t('createCargoButton')}</span>
				</button>
			</div>

			{/* Search */}
			<div className="relative mb-3">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
				<input
					type="text"
					value={searchInput}
					onChange={(e) => setSearchInput(e.target.value)}
					placeholder={t('searchPlaceholder')}
					className="w-full pl-9 pr-9 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all text-sm"
				/>
				{searchInput && (
					<button
						onClick={() => setSearchInput('')}
						className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors">
						<X className="w-3.5 h-3.5" />
					</button>
				)}
			</div>

			{/* Status filter tabs */}
			<div className="flex flex-wrap gap-1.5 mb-5">
				{(['all', 'waiting', 'transit', 'arrived'] as StatusKey[]).map((key) => {
					const isActive = statusFilter === key
					const count = counts[key]
					const colors = filterColors[key]
					return (
						<button
							key={key}
							onClick={() => handleFilterChange(key)}
							className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-all ${
								isActive
									? colors.tab
									: 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900'
							}`}>
							{filterLabels[key]}
							<span
								className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
									isActive ? colors.count : 'bg-slate-100 text-slate-500'
								}`}>
								{count}
							</span>
						</button>
					)
				})}
			</div>

			{/* List */}
			{loading ? (
				<div className="space-y-2.5">
					<CargoSkeleton />
					<CargoSkeleton />
					<CargoSkeleton />
				</div>
			) : counts.all === 0 ? (
				<div className="text-center py-12">
					<Inbox className="w-10 h-10 text-slate-300 mx-auto mb-3" />
					<p className="text-slate-600 font-medium text-sm">{t('noCargos')}</p>
					<p className="text-slate-400 text-xs mt-1">{t('createFirstCargo')}</p>
				</div>
			) : items.length === 0 ? (
				<div className="text-center py-12">
					<SearchX className="w-10 h-10 text-slate-300 mx-auto mb-3" />
					<p className="text-slate-600 font-medium text-sm">{t('nothingFound')}</p>
					<p className="text-slate-400 text-xs mt-1">{t('tryAnotherQuery')}</p>
				</div>
			) : (
				<>
					<div className="space-y-2">
						{items.map((cargo) => (
							<CargoListCard key={cargo.docId} cargo={cargo} />
						))}
					</div>

					{totalPages > 1 && (
						<div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-200">
							<button
								onClick={() => setPage(Math.max(1, currentPage - 1))}
								disabled={currentPage === 1}
								className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 border border-slate-200 hover:border-slate-300 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
								<ChevronLeft className="w-4 h-4" />
							</button>

							<div className="flex items-center gap-1">
								{Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
									const isNear = Math.abs(p - currentPage) <= 1 || p === 1 || p === totalPages
									if (!isNear) {
										if (p === currentPage - 2 || p === currentPage + 2) {
											return (
												<span key={p} className="text-slate-300 text-xs px-1">…</span>
											)
										}
										return null
									}
									return (
										<button
											key={p}
											onClick={() => setPage(p)}
											className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
												p === currentPage
													? 'bg-slate-900 text-white'
													: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
											}`}>
											{p}
										</button>
									)
								})}
							</div>

							<button
								onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
								disabled={currentPage === totalPages}
								className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 border border-slate-200 hover:border-slate-300 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
								<ChevronRight className="w-4 h-4" />
							</button>
						</div>
					)}
				</>
			)}
		</div>
	)
}
