'use client'

import { Package, MapPin, Boxes, Weight, Truck, Clock, AlertTriangle, Calculator, Tag, Percent, ShieldAlert } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { CURRENCY_SYMBOL, MIN_PRICE_KZT } from '@/lib/calculator/config'
import { DISTRICT_LABELS_RU } from '@/lib/calculator/districts'
import type { CalcResult } from '@/lib/calculator/engine'

const ru = (n: number, digits = 0) =>
	n.toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits })

export function ResultPanel({ result, showDisclaimer = true }: { result: CalcResult; showDisclaimer?: boolean }) {
	const { t, tf } = useLang()

	if (result.excluded) {
		return (
			<div className="rounded-2xl border border-red-200 bg-red-50 p-5 flex items-start gap-3">
				<AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
				<div>
					<p className="text-sm font-semibold text-red-700">{t('calcExcludedTitle')}</p>
					<p className="text-sm text-red-600/90 mt-0.5">{t('calcExcludedDesc')}</p>
				</div>
			</div>
		)
	}

	if (!result.ok) {
		const ghostRows = [
			{ Icon: MapPin, label: t('calcResCity') },
			{ Icon: Package, label: t('calcResPlaces') },
			{ Icon: Boxes, label: t('calcResVolume') },
			{ Icon: Weight, label: t('calcResWeight') },
		]
		return (
			<div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
				<div className="px-5 pt-4 pb-3 border-b border-slate-100">
					<p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{t('calcResultTitle')}</p>
				</div>
				<div className="px-5 py-3 divide-y divide-slate-50">
					{ghostRows.map(({ Icon, label }) => (
						<div key={label} className="flex items-center justify-between gap-3 py-2.5">
							<span className="inline-flex items-center gap-2 text-sm text-slate-400">
								<Icon className="w-4 h-4 text-slate-300" />
								{label}
							</span>
							<span className="text-sm text-slate-300">—</span>
						</div>
					))}
				</div>
				<div className="px-5 py-6 bg-slate-50/60 border-t border-slate-100 flex flex-col items-center text-center">
					<Calculator className="w-7 h-7 text-slate-300 mb-2" />
					<p className="text-sm text-slate-400 max-w-[240px]">{t('calcEmptyHint')}</p>
				</div>
			</div>
		)
	}

	const rows: { Icon: typeof Package; label: string; value: string }[] = [
		{ Icon: MapPin, label: t('calcResCity'), value: result.cityName || '' },
		{ Icon: Package, label: t('calcResPlaces'), value: `${result.totals?.totalPlaces ?? 0} ${t('calcPlacesUnit')}` },
		{ Icon: Boxes, label: t('calcResVolume'), value: `${ru(result.totals?.totalVolume ?? 0, 3)} м³` },
		{ Icon: Weight, label: t('calcResWeight'), value: `${ru(result.totals?.totalWeight ?? 0, 1)} кг` },
	]

	const priceText = `${ru(result.price ?? 0)} ${CURRENCY_SYMBOL}`
	const priceSize =
		priceText.length > 15
			? 'text-base sm:text-lg'
			: priceText.length > 12
				? 'text-lg sm:text-xl'
				: priceText.length > 9
					? 'text-xl sm:text-2xl'
					: 'text-2xl sm:text-3xl'

	return (
		<div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
			<div className="px-5 pt-4 pb-3 border-b border-slate-100">
				<p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{t('calcResultTitle')}</p>
			</div>

			<div className="px-5 py-3 divide-y divide-slate-50">
				{rows.map(({ Icon, label, value }) => (
					<div key={label} className="flex items-center justify-between gap-3 py-2">
						<span className="inline-flex items-center gap-2 text-sm text-slate-500">
							<Icon className="w-4 h-4 text-slate-400" />
							{label}
						</span>
						<span className="text-sm font-medium text-slate-900 text-right">{value}</span>
					</div>
				))}
				<div className="flex items-center justify-between gap-3 py-2">
					<span className="inline-flex items-center gap-2 text-sm text-slate-500">
						<Tag className="w-4 h-4 text-slate-400" />
						{t('calcTariffBasis')}
					</span>
					<span className="text-sm font-medium text-slate-900 text-right">
						{result.billedBy === 'volume' ? t('calcBilledVolume') : t('calcBilledWeight')}
					</span>
				</div>
				{result.surchargeApplied && (
					<>
						<div className="flex items-center justify-between gap-3 py-2">
							<span className="inline-flex items-center gap-2 text-sm text-slate-500">
								<Boxes className="w-4 h-4 text-slate-400" />
								{t('calcResBasePrice')}
							</span>
							<span className="text-sm font-medium text-slate-900 text-right">
								{ru(result.basePrice ?? 0)} {CURRENCY_SYMBOL}
							</span>
						</div>
						<div className="flex items-center justify-between gap-3 py-2">
							<span className="inline-flex items-center gap-2 text-sm text-slate-500">
								<Percent className="w-4 h-4 text-slate-400" />
								{t('calcSurchargeLabel')}
								{result.district && (
									<span className="text-[11px] text-slate-400">({DISTRICT_LABELS_RU[result.district]})</span>
								)}
							</span>
							<span className="text-sm font-semibold text-orange-600 text-right">+{result.surchargePct ?? 0}%</span>
						</div>
					</>
				)}
			</div>

			{/* Price + days */}
			<div className="px-5 py-4 bg-gradient-to-br from-orange-50 to-amber-50 border-t border-orange-100">
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0 flex-1">
						<p className="text-[11px] font-semibold text-orange-700/80 uppercase tracking-wide mb-1 leading-snug min-h-[2rem]">
							{t('calcResPrice')}
						</p>
						<p className={`${priceSize} font-bold text-slate-900 tracking-tight leading-tight whitespace-nowrap`}>
							{priceText}
						</p>
					</div>
					<div className="flex flex-col items-end shrink-0">
						<p className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 whitespace-nowrap">
							<Truck className="w-4 h-4 text-orange-500" />
							{result.days} {t('unitDays')}
						</p>
						<p className="inline-flex items-center gap-1 text-[11px] text-slate-400 mt-0.5 whitespace-nowrap">
							<Clock className="w-3 h-3" />
							{t('calcResDays')}
						</p>
					</div>
				</div>
				{result.minApplied && (
					<p className="mt-2.5 inline-flex items-start gap-1.5 text-[11px] text-orange-700/80">
						<ShieldAlert className="w-3.5 h-3.5 mt-px shrink-0" />
						{tf('calcMinTariffNote', { min: ru(MIN_PRICE_KZT) })}
					</p>
				)}
			</div>

			{showDisclaimer && (
				<div className="px-5 py-2.5 bg-slate-50/70 border-t border-slate-100">
					<p className="text-[11px] text-slate-400 leading-relaxed">{t('calcDisclaimer')}</p>
				</div>
			)}
		</div>
	)
}
