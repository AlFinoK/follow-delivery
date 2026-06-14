'use client'

import { Package, MapPin, Truck, Clock, CheckCircle2, ArrowRight, RotateCcw } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { formatDate } from '@/lib/format'

interface CargoData {
	id: string
	name?: string
	fromCity: string
	currentCity: string
	toCity: string
	status: string
	createdAt?: any
	acceptanceDate?: string | null
	shipmentDate?: string | null
	deliveryTimeframe?: string | null
	deliveryAmount?: number | null
	paymentStatus?: string | null
	partialPaymentDetail?: string | null
	currency?: string | null
}

const STATUS_STEPS = ['ожидает отправления', 'в пути', 'прибыл'] as const

function getStatusLabel(status: string, t: (key: any) => string): string {
	if (status === 'ожидает отправления') return t('statusWaiting')
	if (status === 'в пути') return t('statusInTransit')
	if (status === 'прибыл') return t('statusArrived')
	return status
}

function getStatusBadge(status: string) {
	switch (status) {
		case 'в пути':
			return { cls: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' }
		case 'ожидает отправления':
			return { cls: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' }
		case 'прибыл':
			return { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' }
		default:
			return { cls: 'bg-slate-50 text-slate-600 border-slate-200', dot: 'bg-slate-400' }
	}
}

function getStatusIcon(status: string) {
	if (status === 'в пути') return Truck
	if (status === 'прибыл') return CheckCircle2
	return Clock
}

function getStepIndex(status: string) {
	return STATUS_STEPS.indexOf(status as (typeof STATUS_STEPS)[number])
}

interface CargoResultCardProps {
	cargo: CargoData
	onNewSearch: () => void
}

export function CargoResultCard({ cargo, onNewSearch }: CargoResultCardProps) {
	const { t } = useLang()

	const steps = [
		{ status: 'ожидает отправления', label: t('statusWaiting'), Icon: Clock },
		{ status: 'в пути', label: t('statusInTransit'), Icon: Truck },
		{ status: 'прибыл', label: t('statusArrived'), Icon: CheckCircle2 },
	]

	const currencySymbol = cargo.currency === 'RUB' ? '₽' : '₸'

	const hasDetails =
		cargo.acceptanceDate ||
		cargo.shipmentDate ||
		cargo.deliveryTimeframe ||
		cargo.deliveryAmount != null ||
		(cargo.paymentStatus && cargo.paymentStatus !== 'none')

	const badge = getStatusBadge(cargo.status)
	const StatusIcon = getStatusIcon(cargo.status)
	const currentIdx = getStepIndex(cargo.status)

	return (
		<div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
			<div className="p-4 sm:p-7 flex flex-col gap-4 sm:gap-5">
				{/* Status header */}
				<div className="flex items-start gap-3">
					<div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
						<StatusIcon className="w-5 h-5 text-orange-600" />
					</div>
					<div className="flex-1 min-w-0">
						<p className="text-xs font-medium text-slate-500 mb-1">{t('cargoStatusLabel')}</p>
						<span
							className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold border ${badge.cls}`}>
							<span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
							{getStatusLabel(cargo.status, t)}
						</span>
					</div>
				</div>

				{/* Track ID */}
				<div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
					<p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">{t('trackNumberLabel')}</p>
					<p className="font-mono text-xs text-slate-700 break-all">{cargo.id}</p>
				</div>

				{/* Route */}
				<div className="bg-slate-50 border border-slate-200 rounded-lg p-3 sm:p-4">
					<p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3">{t('routeLabel')}</p>
					<div className="flex items-start gap-1 sm:gap-2">
						<div className="flex-1 min-w-0 text-center">
							<Package className="w-4 h-4 text-slate-400 mx-auto mb-1.5" />
							<p className="text-[10px] text-slate-500 font-medium uppercase mb-0.5">{t('fromLabel')}</p>
							<p className="text-[13px] sm:text-sm font-semibold text-slate-900 leading-tight break-words">{cargo.fromCity}</p>
						</div>
						<ArrowRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
						<div className="flex-1 min-w-0 text-center">
							<MapPin className="w-4 h-4 text-orange-500 mx-auto mb-1.5" />
							<p className="text-[10px] text-orange-600 font-medium uppercase mb-0.5">{t('currentLabel')}</p>
							<p className="text-[13px] sm:text-sm font-semibold text-slate-900 leading-tight break-words">{cargo.currentCity || cargo.fromCity}</p>
						</div>
						<ArrowRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
						<div className="flex-1 min-w-0 text-center">
							<CheckCircle2 className="w-4 h-4 text-slate-400 mx-auto mb-1.5" />
							<p className="text-[10px] text-slate-500 font-medium uppercase mb-0.5">{t('toLabel')}</p>
							<p className="text-[13px] sm:text-sm font-semibold text-slate-900 leading-tight break-words">{cargo.toCity}</p>
						</div>
					</div>
				</div>

				{/* Details */}
				{hasDetails && (
					<div className="bg-slate-50 border border-slate-200 rounded-lg p-3 sm:p-4">
						<p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3">{t('detailsLabel')}</p>
						<div className="space-y-2">
							{cargo.acceptanceDate && (
								<div className="flex justify-between items-center text-xs">
									<span className="text-slate-500">{t('acceptanceDateLabel')}</span>
									<span className="text-slate-900 font-medium">{formatDate(cargo.acceptanceDate)}</span>
								</div>
							)}
							{cargo.shipmentDate && (
								<div className="flex justify-between items-center text-xs">
									<span className="text-slate-500">{t('shipmentDateLabel')}</span>
									<span className="text-slate-900 font-medium">{formatDate(cargo.shipmentDate)}</span>
								</div>
							)}
							{cargo.deliveryTimeframe && (
								<div className="flex justify-between items-center text-xs">
									<span className="text-slate-500">{t('deliveryTimeframeLabel')}</span>
									<span className="text-slate-900 font-medium">
										{(() => {
											const [num, unit] = cargo.deliveryTimeframe!.split('|')
											if (!unit) return cargo.deliveryTimeframe
											const key = unit === 'weeks' ? 'unitWeeks' : unit === 'months' ? 'unitMonths' : 'unitDays'
											return `${num} ${t(key as any)}`
										})()}
									</span>
								</div>
							)}
							{cargo.deliveryAmount != null && (
								<div className="flex justify-between items-center text-xs">
									<span className="text-slate-500">{t('deliveryAmountLabel')}</span>
									<span className="text-slate-900 font-medium">
										{cargo.deliveryAmount.toLocaleString()} {currencySymbol}
									</span>
								</div>
							)}
							{cargo.paymentStatus && cargo.paymentStatus !== 'none' && (
								<>
									<div className="flex justify-between items-center text-xs">
										<span className="text-slate-500">{t('paymentStatusLabel')}</span>
										<span
											className={`font-semibold px-2 py-0.5 rounded-md text-[11px] ${
												cargo.paymentStatus === 'full'
													? 'bg-emerald-50 text-emerald-700'
													: 'bg-amber-50 text-amber-700'
											}`}>
											{cargo.paymentStatus === 'full' ? t('paymentFull') : t('paymentPartial')}
										</span>
									</div>
									{cargo.paymentStatus === 'partial' && cargo.partialPaymentDetail && (
										<div className="flex justify-between items-center text-xs">
											<span className="text-slate-500">{t('partialPaymentDetailLabel')}</span>
											<span className="text-slate-900 font-medium">
												{!isNaN(Number(cargo.partialPaymentDetail))
													? Number(cargo.partialPaymentDetail).toLocaleString()
													: cargo.partialPaymentDetail}{' '}
												{currencySymbol}
											</span>
										</div>
									)}
								</>
							)}
						</div>
					</div>
				)}

				{/* Timeline */}
				<div>
					<p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3">{t('stagesLabel')}</p>
					<div className="space-y-2">
						{steps.map((step, i) => {
							const done = i <= currentIdx
							const active = i === currentIdx
							const Icon = step.Icon
							return (
								<div
									key={step.status}
									className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium border ${
										active
											? 'bg-orange-50 border-orange-200 text-orange-700'
											: done
												? 'bg-emerald-50 border-emerald-200 text-emerald-700'
												: 'bg-slate-50 border-slate-200 text-slate-400'
									}`}>
									<Icon className={`w-3.5 h-3.5 shrink-0 ${!done && !active ? 'opacity-50' : ''}`} />
									<span>{step.label}</span>
									{done && !active && <CheckCircle2 className="ml-auto w-3.5 h-3.5" />}
									{active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />}
								</div>
							)
						})}
					</div>
				</div>

				<button
					onClick={onNewSearch}
					className="inline-flex items-center justify-center gap-2 w-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors">
					<RotateCcw className="w-4 h-4" />
					{t('newSearchButton')}
				</button>
			</div>
		</div>
	)
}
