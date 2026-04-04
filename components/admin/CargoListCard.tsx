'use client'

import { useRouter } from 'next/navigation'
import { useLang } from '@/contexts/LangContext'
import type { Cargo } from './types'

function getStatusBadge(status: string, t: (k: any) => string) {
	if (status === 'в пути') return { label: t('statusInTransit'), cls: 'bg-blue-100 text-blue-700 border-blue-200' }
	if (status === 'прибыл')
		return { label: t('statusArrived'), cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
	return { label: t('statusWaiting'), cls: 'bg-amber-100 text-amber-700 border-amber-200' }
}

export function CargoListCard({ cargo }: { cargo: Cargo }) {
	const router = useRouter()
	const { t } = useLang()
	const badge = getStatusBadge(cargo.status, t)

	return (
		<button
			onClick={() => router.push(`/admin/cargo/${cargo.docId}`)}
			className="w-full text-left bg-white rounded-xl p-4 sm:p-5 border-2 border-orange-100 hover:border-orange-300 hover:shadow-md transition-all group cursor-pointer">
			{/* Top: name + status badge + arrow */}
			<div className="flex items-start justify-between gap-3 mb-3">
				<div className="flex-1 min-w-0">
					{cargo.name ? (
						<p className="font-bold text-gray-900 text-sm truncate group-hover:text-orange-600 transition-colors">
							{cargo.name}
						</p>
					) : (
						<p className="text-gray-400 italic text-sm">{t('noName')}</p>
					)}
					<p className="text-xs text-gray-400 font-mono mt-0.5 truncate">{cargo.id}</p>
				</div>
				<div className="flex items-center gap-2 flex-shrink-0">
					<span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${badge.cls}`}>{badge.label}</span>
				</div>
			</div>

			{/* Route */}
			<div className="flex items-center gap-1.5 text-xs">
				<div className="flex items-center gap-1 min-w-0 shrink">
					<span className="text-base shrink-0">📤</span>
					<span className="text-gray-700 font-semibold truncate">{cargo.fromCity}</span>
				</div>
				<div className="flex items-center gap-0.5 shrink-0 px-1">
					<div className="w-4 h-px bg-orange-200" />
					<span className="text-orange-400 text-[10px]">›</span>
					<div className="w-4 h-px bg-orange-200" />
				</div>
				<div className="flex items-center gap-1 min-w-0 shrink">
					<span className="text-base shrink-0">📍</span>
					<span className="text-gray-700 font-semibold truncate">{cargo.currentCity}</span>
				</div>
				<div className="flex items-center gap-0.5 shrink-0 px-1">
					<div className="w-4 h-px bg-orange-200" />
					<span className="text-orange-400 text-[10px]">›</span>
					<div className="w-4 h-px bg-orange-200" />
				</div>
				<div className="flex items-center gap-1 min-w-0 shrink">
					<span className="text-base shrink-0">📥</span>
					<span className="text-gray-700 font-semibold truncate">{cargo.toCity}</span>
				</div>
			</div>
		</button>
	)
}
