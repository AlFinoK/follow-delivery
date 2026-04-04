'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/contexts/LangContext'
import { Spinner } from '@/components/Spinner'
import { CargoListCard } from './CargoListCard'
import { CargoSkeleton } from './CargoSkeleton'
import type { Cargo } from './types'

const PAGE_SIZE = 8

const STATUS_FILTERS = [
	{ key: 'all' as const },
	{ key: 'waiting' as const, value: 'ожидает отправления' },
	{ key: 'transit' as const, value: 'в пути' },
	{ key: 'arrived' as const, value: 'прибыл' },
]

interface CargoListProps {
	cargos: Cargo[]
	loadingCargos: boolean
}

export function CargoList({ cargos, loadingCargos }: CargoListProps) {
	const { t, tf } = useLang()
	const router = useRouter()
	const [searchQuery, setSearchQuery] = useState('')
	const [statusFilter, setStatusFilter] = useState<'all' | 'waiting' | 'transit' | 'arrived'>('all')
	const [page, setPage] = useState(1)

	const filtered = useMemo(() => {
		let result = cargos

		if (statusFilter !== 'all') {
			const statusValue = STATUS_FILTERS.find((f) => f.key === statusFilter)?.value
			result = result.filter((c) => c.status === statusValue)
		}

		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase()
			result = result.filter(
				(c) =>
					c.id.toLowerCase().includes(q) ||
					(c.name ?? '').toLowerCase().includes(q) ||
					c.fromCity.toLowerCase().includes(q) ||
					c.toCity.toLowerCase().includes(q) ||
					c.currentCity.toLowerCase().includes(q) ||
					c.status.toLowerCase().includes(q),
			)
		}

		return result
	}, [cargos, searchQuery, statusFilter])

	const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
	const currentPage = Math.min(page, totalPages)
	const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

	const handleFilterChange = (key: typeof statusFilter) => {
		setStatusFilter(key)
		setPage(1)
	}

	const handleSearch = (value: string) => {
		setSearchQuery(value)
		setPage(1)
	}

	const filterLabels: Record<typeof statusFilter, string> = {
		all: t('filterAll'),
		waiting: t('statusWaiting'),
		transit: t('statusInTransit'),
		arrived: t('statusArrived'),
	}

	const filterColors: Record<typeof statusFilter, { active: string; count: string }> = {
		all: { active: 'bg-orange-500 text-white border-orange-500', count: 'bg-orange-100 text-orange-600' },
		waiting: { active: 'bg-amber-500 text-white border-amber-500', count: 'bg-amber-100 text-amber-700' },
		transit: { active: 'bg-blue-500 text-white border-blue-500', count: 'bg-blue-100 text-blue-700' },
		arrived: { active: 'bg-emerald-500 text-white border-emerald-500', count: 'bg-emerald-100 text-emerald-700' },
	}

	const getCargosForFilter = (key: typeof statusFilter) => {
		if (key === 'all') return cargos.length
		const statusValue = STATUS_FILTERS.find((f) => f.key === key)?.value
		return cargos.filter((c) => c.status === statusValue).length
	}

	return (
		<div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 border border-orange-100">
			{/* Header */}
			<div className="flex items-center gap-3 mb-4 sm:mb-5">
				<span className="text-2xl sm:text-3xl">📦</span>
				<div className="flex-1">
					<div className="flex items-center gap-2">
						<h2 className="text-xl sm:text-2xl font-black text-gray-900">{t('cargosTitle')}</h2>
						{loadingCargos && cargos.length > 0 && <Spinner />}
					</div>
					<p className="text-orange-600 text-xs sm:text-sm">
						{searchQuery.trim() || statusFilter !== 'all'
							? tf('foundCount', { found: filtered.length, total: cargos.length })
							: tf('totalCount', { total: cargos.length })}
					</p>
				</div>
				<button
					onClick={() => router.push('/admin/cargo/new')}
					className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-xl font-bold text-sm hover:shadow-lg transition-all flex-shrink-0">
					<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
						<path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
					</svg>
					<span className="hidden sm:inline">{t('createCargoButton').replace('✨ ', '')}</span>
				</button>
			</div>

			{/* Search */}
			<div className="relative mb-4">
				<input
					type="text"
					value={searchQuery}
					onChange={(e) => handleSearch(e.target.value)}
					placeholder={t('searchPlaceholder')}
					className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-2 border-orange-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-400/30 transition-all text-sm"
				/>
				<svg
					className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400"
					viewBox="0 0 20 20"
					fill="currentColor">
					<path
						fillRule="evenodd"
						d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
						clipRule="evenodd"
					/>
				</svg>
				{searchQuery && (
					<button
						onClick={() => handleSearch('')}
						className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
						✕
					</button>
				)}
			</div>

			{/* Status filter tabs */}
			<div className="flex flex-wrap gap-2 mb-5">
				{STATUS_FILTERS.map(({ key }) => {
					const isActive = statusFilter === key
					const count = getCargosForFilter(key)
					const colors = filterColors[key]
					return (
						<button
							key={key}
							onClick={() => handleFilterChange(key)}
							className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
								isActive
									? colors.active
									: 'bg-white text-gray-600 border-gray-200 hover:border-orange-300 hover:text-orange-600'
							}`}>
							{filterLabels[key]}
							<span
								className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
									isActive ? 'bg-white/25 text-white' : colors.count
								}`}>
								{count}
							</span>
						</button>
					)
				})}
			</div>

			{/* List */}
			{loadingCargos && cargos.length === 0 ? (
				<div className="space-y-3">
					<CargoSkeleton />
					<CargoSkeleton />
					<CargoSkeleton />
				</div>
			) : cargos.length === 0 ? (
				<div className="text-center py-12">
					<p className="text-4xl mb-3">📭</p>
					<p className="text-gray-500 font-semibold">{t('noCargos')}</p>
					<p className="text-gray-400 text-sm mt-1">{t('createFirstCargo')}</p>
				</div>
			) : filtered.length === 0 ? (
				<div className="text-center py-12">
					<p className="text-4xl mb-3">🔍</p>
					<p className="text-gray-500 font-semibold">{t('nothingFound')}</p>
					<p className="text-gray-400 text-sm mt-1">{t('tryAnotherQuery')}</p>
				</div>
			) : (
				<>
					<div className="space-y-3">
						{paginated.map((cargo) => (
							<CargoListCard key={cargo.docId} cargo={cargo} />
						))}
					</div>

					{/* Pagination */}
					{totalPages > 1 && (
						<div className="flex items-center justify-between mt-5 pt-4 border-t border-orange-100">
							<button
								onClick={() => setPage((p) => Math.max(1, p - 1))}
								disabled={currentPage === 1}
								className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-gray-600 border border-gray-200 hover:border-orange-300 hover:text-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
								<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
									<path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
								</svg>
							</button>

							<div className="flex items-center gap-1">
								{Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
									const isNear = Math.abs(p - currentPage) <= 1 || p === 1 || p === totalPages
									if (!isNear) {
										if (p === currentPage - 2 || p === currentPage + 2) {
											return (
												<span key={p} className="text-gray-400 text-sm px-1">
													…
												</span>
											)
										}
										return null
									}
									return (
										<button
											key={p}
											onClick={() => setPage(p)}
											className={`w-8 h-8 rounded-lg text-sm font-bold transition-all ${
												p === currentPage
													? 'bg-orange-500 text-white shadow-sm'
													: 'text-gray-600 hover:bg-orange-50 hover:text-orange-600'
											}`}>
											{p}
										</button>
									)
								})}
							</div>

							<button
								onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
								disabled={currentPage === totalPages}
								className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-gray-600 border border-gray-200 hover:border-orange-300 hover:text-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
								<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
									<path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
								</svg>
							</button>
						</div>
					)}
				</>
			)}
		</div>
	)
}
