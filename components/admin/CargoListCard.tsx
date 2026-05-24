'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Package, MapPin, ArrowRight, Folder } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import type { Cargo } from './types'

function getStatusBadge(status: string, t: (k: any) => string) {
	if (status === 'в пути') return { label: t('statusInTransit'), cls: 'bg-blue-50 text-blue-700 border-blue-200' }
	if (status === 'прибыл') return { label: t('statusArrived'), cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
	return { label: t('statusWaiting'), cls: 'bg-amber-50 text-amber-700 border-amber-200' }
}

export function CargoListCard({ cargo }: { cargo: Cargo }) {
	const router = useRouter()
	const searchParams = useSearchParams()
	const { t } = useLang()
	const badge = getStatusBadge(cargo.status, t)

	const handleOpen = () => {
		const qs = searchParams.toString()
		router.push(qs ? `/admin/cargo/${cargo.docId}?${qs}` : `/admin/cargo/${cargo.docId}`)
	}

	return (
		<button
			onClick={handleOpen}
			className="w-full text-left bg-white rounded-lg p-4 border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all group cursor-pointer">
			<div className="flex items-center justify-between gap-3 mb-2.5">
				<div className="flex-1 min-w-0">
					{cargo.name || cargo.cargoNumber != null ? (
						<p className="font-semibold text-slate-900 text-sm truncate group-hover:text-orange-600 transition-colors">
							{cargo.cargoNumber != null && (
								<span className="text-orange-600 mr-1.5">№{cargo.cargoNumber}</span>
							)}
							{cargo.name}
						</p>
					) : (
						<p className="text-slate-400 italic text-sm">{t('noName')}</p>
					)}
					<p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">{cargo.id}</p>
				</div>
				<div className="flex items-center gap-2 shrink-0">
					{cargo.folderId && (
						<span className="inline-flex items-center text-slate-400" title="В папке">
							<Folder className="w-3.5 h-3.5" />
						</span>
					)}
					<span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${badge.cls}`}>{badge.label}</span>
				</div>
			</div>

			<div className="flex items-center gap-1.5 text-xs">
				<Package className="w-3.5 h-3.5 text-slate-400 shrink-0" />
				<span className="text-slate-600 truncate">{cargo.fromCity}</span>
				<ArrowRight className="w-3 h-3 text-slate-300 shrink-0" />
				<MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
				<span className="text-slate-900 font-medium truncate">{cargo.currentCity}</span>
				<ArrowRight className="w-3 h-3 text-slate-300 shrink-0" />
				<span className="text-slate-600 truncate">{cargo.toCity}</span>
			</div>
		</button>
	)
}
