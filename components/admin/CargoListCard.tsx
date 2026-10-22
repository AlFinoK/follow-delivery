'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { MapPin, ArrowRight, Folder, CalendarDays } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { formatDate, formatMoney } from '@/lib/format'
import { getStatusUi, getPaymentUi, showCurrentCity } from './statusUi'
import type { Cargo } from './types'

// Компактная строка списка грузов (кликабельная карточка, не таблица — на мобиле перестраивается):
//   1: №номер · название ............ [папка] [статус]   | сумма
//   2: откуда → (сейчас →) куда · дата приёма · трек      | оплата
// На узком экране статус и папка уходят третьей строкой, чтобы название получило всю ширину.
export function CargoListCard({ cargo }: { cargo: Cargo }) {
	const router = useRouter()
	const searchParams = useSearchParams()
	const { t } = useLang()
	const badge = getStatusUi(cargo.status, t)
	const pay = getPaymentUi(cargo.paymentStatus, t)
	const money = formatMoney(cargo.deliveryAmount, cargo.currency)
	const withCurrent = showCurrentCity(cargo)

	const handleOpen = () => {
		const qs = searchParams.toString()
		router.push(qs ? `/admin/cargo/${cargo.docId}?${qs}` : `/admin/cargo/${cargo.docId}`)
	}

	// Папка груза видна прямо в списке и в результатах поиска (правка заказчика)
	const folderBadge = cargo.folderId ? (
		<span
			className="inline-flex items-center gap-1 min-w-0 max-w-[200px] sm:max-w-[140px] text-[11px] leading-4 font-medium text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-md px-1.5 py-px"
			title={cargo.folderName ? `${t('folderLabel')}: ${cargo.folderName}` : t('folderInBadge')}>
			<Folder className="w-3 h-3 shrink-0" />
			<span className="truncate">{cargo.folderName ?? t('folderInBadge')}</span>
		</span>
	) : null

	const statusBadge = (
		<span className={`inline-flex items-center gap-1 shrink-0 text-[11px] leading-4 font-semibold px-1.5 py-px rounded-md border ${badge.cls}`}>
			<span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
			{badge.label}
		</span>
	)

	const trackId = (
		<span className="min-w-0 truncate font-mono text-[10px] text-slate-400 dark:text-zinc-500" title={cargo.id}>{cargo.id}</span>
	)

	return (
		<button
			onClick={handleOpen}
			className="w-full text-left bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 sm:px-3.5 border border-slate-200 dark:border-zinc-700 hover:border-orange-300 dark:hover:border-orange-500/40 hover:bg-orange-50/30 dark:hover:bg-zinc-800/40 transition-colors group cursor-pointer">
			<div className="flex items-start gap-3">
				<div className="flex-1 min-w-0">
					{/* 1: номер + название + (sm+) папка и статус */}
					<div className="flex items-center gap-2 min-w-0">
						<p className="flex-1 min-w-0 truncate text-sm font-semibold leading-5 text-slate-900 dark:text-zinc-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
							{cargo.cargoNumber != null && (
								<span className="text-orange-600 dark:text-orange-400 mr-1.5">№{cargo.cargoNumber}</span>
							)}
							{cargo.name || <span className="text-slate-400 dark:text-zinc-500 italic font-medium">{t('noName')}</span>}
						</p>
						<div className="hidden sm:flex items-center gap-1.5 shrink-0 max-w-[50%]">
							{folderBadge}
							{statusBadge}
						</div>
					</div>

					{/* 2: маршрут · дата приёма · (sm+) трек. На мобиле маршрут переносится целыми
					    словами, а не режется: при трёх городах обрезка давала «А… → П… → Сан…». */}
					<div className="mt-0.5 flex flex-wrap sm:flex-nowrap items-center gap-x-1.5 gap-y-0.5 min-w-0 text-xs leading-4 text-slate-600 dark:text-zinc-300">
						<span className="flex flex-wrap sm:flex-nowrap items-center gap-1 min-w-0 shrink">
							<span className="sm:truncate">{cargo.fromCity}</span>
							<ArrowRight className="w-3 h-3 text-slate-300 dark:text-zinc-600 shrink-0" />
							{withCurrent && (
								<>
									<span className="inline-flex items-center gap-0.5 min-w-0 text-orange-600 dark:text-orange-400 font-medium" title={t('currentLocationLabel')}>
										<MapPin className="w-3 h-3 shrink-0" />
										<span className="sm:truncate">{cargo.currentCity}</span>
									</span>
									<ArrowRight className="w-3 h-3 text-slate-300 dark:text-zinc-600 shrink-0" />
								</>
							)}
							<span className="sm:truncate">{cargo.toCity}</span>
						</span>
						{cargo.acceptanceDate && (
							<span className="inline-flex items-center gap-1 shrink-0 text-slate-400 dark:text-zinc-500" title={t('acceptanceDateLabel')}>
								<CalendarDays className="w-3 h-3" />
								{formatDate(cargo.acceptanceDate)}
							</span>
						)}
						<span className="hidden sm:inline-flex min-w-0 shrink-[2] ml-1">{trackId}</span>
					</div>

					{/* 3 (только мобила): статус · папка. Трек-номер на мобиле не показываем — места
					    нет, а полный номер есть на карточке груза. */}
					<div className="sm:hidden mt-1 flex flex-wrap items-center gap-1.5 min-w-0">
						{statusBadge}
						{folderBadge}
					</div>
				</div>

				{/* Справа: сумма + оплата */}
				<div className="shrink-0 flex flex-col items-end gap-0.5 text-right">
					<p className={`text-sm leading-5 font-semibold tabular-nums whitespace-nowrap ${money ? 'text-slate-900 dark:text-zinc-100' : 'text-slate-300 dark:text-zinc-600'}`}>
						{money || '—'}
					</p>
					<span className={`text-[10px] leading-[14px] font-semibold px-1.5 py-px rounded border whitespace-nowrap ${pay.cls}`} title={pay.label}>
						{pay.short}
					</span>
				</div>
			</div>
		</button>
	)
}
