'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Package, MapPin, ArrowRight, Folder } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { useBasePath } from '@/contexts/DemoContext'
import type { Cargo } from './types'

function getStatusBadge(status: string, t: (k: any) => string) {
	if (status === 'в пути') return { label: t('statusInTransit'), cls: 'bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/25' }
	if (status === 'прибыл') return { label: t('statusArrived'), cls: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/25' }
	return { label: t('statusWaiting'), cls: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/25' }
}

export function CargoListCard({ cargo }: { cargo: Cargo }) {
	const router = useRouter()
	const searchParams = useSearchParams()
	const { t } = useLang()
	const base = useBasePath()
	const badge = getStatusBadge(cargo.status, t)

	const handleOpen = () => {
		const qs = searchParams.toString()
		router.push(qs ? `${base}/admin/cargo/${cargo.docId}?${qs}` : `${base}/admin/cargo/${cargo.docId}`)
	}

	return (
		<button
			onClick={handleOpen}
			className="w-full text-left bg-white dark:bg-zinc-900 rounded-lg p-4 border border-slate-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-600 hover:shadow-sm transition-all group cursor-pointer">
			<div className="flex items-center justify-between gap-3 mb-2.5">
				<div className="flex-1 min-w-0">
					{cargo.name || cargo.cargoNumber != null ? (
						<p className="font-semibold text-slate-900 dark:text-zinc-100 text-sm truncate group-hover:text-orange-600 transition-colors">
							{cargo.cargoNumber != null && (
								<span className="text-orange-600 dark:text-orange-400 mr-1.5">№{cargo.cargoNumber}</span>
							)}
							{cargo.name}
						</p>
					) : (
						<p className="text-slate-400 dark:text-zinc-500 italic text-sm">{t('noName')}</p>
					)}
					<p className="text-[11px] text-slate-400 dark:text-zinc-500 font-mono mt-0.5 truncate">{cargo.id}</p>
				</div>
				<div className="flex items-center gap-2 shrink-0">
					{cargo.folderId && (
						<span className="inline-flex items-center text-slate-400 dark:text-zinc-500" title="В папке">
							<Folder className="w-3.5 h-3.5" />
						</span>
					)}
					<span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${badge.cls}`}>{badge.label}</span>
				</div>
			</div>

			<div className="flex items-center gap-1.5 text-xs">
				<Package className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 shrink-0" />
				<span className="text-slate-600 dark:text-zinc-300 truncate">{cargo.fromCity}</span>
				<ArrowRight className="w-3 h-3 text-slate-300 dark:text-zinc-600 shrink-0" />
				<MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
				<span className="text-slate-900 dark:text-zinc-100 font-medium truncate">{cargo.currentCity}</span>
				<ArrowRight className="w-3 h-3 text-slate-300 dark:text-zinc-600 shrink-0" />
				<span className="text-slate-600 dark:text-zinc-300 truncate">{cargo.toCity}</span>
			</div>
		</button>
	)
}
