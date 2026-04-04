'use client'

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

function getStatusColor(status: string) {
	switch (status) {
		case 'в пути':
			return { badge: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-500' }
		case 'ожидает отправления':
			return { badge: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500' }
		case 'прибыл':
			return { badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' }
		default:
			return { badge: 'bg-gray-100 text-gray-600 border-gray-200', dot: 'bg-gray-400' }
	}
}

function getStatusIcon(status: string): string {
	switch (status) {
		case 'в пути':
			return '🚚'
		case 'ожидает отправления':
			return '⏳'
		case 'прибыл':
			return '✅'
		default:
			return '📦'
	}
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
		{ status: 'ожидает отправления', label: t('statusWaiting'), icon: '📋' },
		{ status: 'в пути', label: t('statusInTransit'), icon: '🚚' },
		{ status: 'прибыл', label: t('statusArrived'), icon: '🎉' },
	]

	const currencySymbol = cargo.currency === 'RUB' ? '₽' : '₸'

	const hasDetails =
		cargo.acceptanceDate ||
		cargo.shipmentDate ||
		cargo.deliveryTimeframe ||
		cargo.deliveryAmount != null ||
		(cargo.paymentStatus && cargo.paymentStatus !== 'none')

	return (
		<div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl shadow-orange-100/60 border border-orange-100/80 overflow-hidden animate-in fade-in duration-300">
			{/* Card top accent */}
			<div className="h-1 w-full bg-gradient-to-r from-amber-400 to-orange-500" />

			<div className="p-6 sm:p-8">
				{/* Status header */}
				<div className="flex items-start gap-4 mb-6">
					<span className="text-4xl leading-none">{getStatusIcon(cargo.status)}</span>
					<div className="flex-1 min-w-0">
						<h3 className="text-sm font-bold text-gray-500 mb-1">{t('cargoStatusLabel')}</h3>
						<span
							className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(cargo.status).badge}`}>
							<span className={`w-1.5 h-1.5 rounded-full ${getStatusColor(cargo.status).dot}`} />
							{getStatusLabel(cargo.status, t).toUpperCase()}
						</span>
					</div>
				</div>

				{/* Track ID */}
				<div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 mb-5">
					<p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mb-1">{t('trackNumberLabel')}</p>
					<p className="font-mono text-xs sm:text-sm text-gray-800 font-semibold break-all">{cargo.id}</p>
				</div>

				{/* Route visual */}
				<div className="bg-gray-50 border border-orange-100 rounded-xl p-4 sm:p-5 mb-5">
					<p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mb-4">{t('routeLabel')}</p>
					<div className="flex items-center gap-1.5">
						<div className="flex-1 min-w-0 text-center">
							<div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-1.5">
								<span className="text-sm">📤</span>
							</div>
							<p className="text-[10px] text-orange-500 font-bold uppercase mb-0.5">{t('fromLabel')}</p>
							<p className="text-xs sm:text-sm font-bold text-gray-900 truncate">{cargo.fromCity}</p>
						</div>
						<div className="flex items-center gap-0.5 flex-shrink-0 pb-3">
							<div className="w-4 h-px bg-orange-300" />
							<div className="w-4 h-px bg-orange-300" />
							<span className="text-orange-400 text-xs">›</span>
						</div>
						<div className="flex-1 min-w-0 text-center">
							<div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-1.5">
								<span className="text-sm">📍</span>
							</div>
							<p className="text-[10px] text-blue-500 font-bold uppercase mb-0.5">{t('currentLabel')}</p>
							<p className="text-xs sm:text-sm font-bold text-gray-900 truncate">{cargo.currentCity || cargo.fromCity}</p>
						</div>
						<div className="flex items-center gap-0.5 flex-shrink-0 pb-3">
							<div className="w-4 h-px bg-orange-300" />
							<div className="w-4 h-px bg-orange-300" />
							<span className="text-orange-400 text-xs">›</span>
						</div>
						<div className="flex-1 min-w-0 text-center">
							<div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-1.5">
								<span className="text-sm">📥</span>
							</div>
							<p className="text-[10px] text-emerald-600 font-bold uppercase mb-0.5">{t('toLabel')}</p>
							<p className="text-xs sm:text-sm font-bold text-gray-900 truncate">{cargo.toCity}</p>
						</div>
					</div>
				</div>

				{/* Details */}
				{hasDetails && (
					<div className="bg-gray-50 border border-orange-100 rounded-xl p-4 sm:p-5 mb-5">
						<p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mb-4">{t('detailsLabel')}</p>
						<div className="space-y-2.5">
							{cargo.acceptanceDate && (
								<div className="flex justify-between items-center">
									<span className="text-gray-500 text-xs font-medium">{t('acceptanceDateLabel')}</span>
									<span className="text-gray-800 text-xs font-semibold">{formatDate(cargo.acceptanceDate)}</span>
								</div>
							)}
							{cargo.shipmentDate && (
								<div className="flex justify-between items-center">
									<span className="text-gray-500 text-xs font-medium">{t('shipmentDateLabel')}</span>
									<span className="text-gray-800 text-xs font-semibold">{formatDate(cargo.shipmentDate)}</span>
								</div>
							)}
							{cargo.deliveryTimeframe && (
								<div className="flex justify-between items-center">
									<span className="text-gray-500 text-xs font-medium">{t('deliveryTimeframeLabel')}</span>
									<span className="text-gray-800 text-xs font-semibold">
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
								<div className="flex justify-between items-center">
									<span className="text-gray-500 text-xs font-medium">{t('deliveryAmountLabel')}</span>
									<span className="text-gray-800 text-xs font-semibold">
										{cargo.deliveryAmount.toLocaleString()} {currencySymbol}
									</span>
								</div>
							)}
							{cargo.paymentStatus && cargo.paymentStatus !== 'none' && (
								<>
									<div className="flex justify-between items-center">
										<span className="text-gray-500 text-xs font-medium">{t('paymentStatusLabel')}</span>
										<span
											className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
												cargo.paymentStatus === 'full' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
											}`}>
											{cargo.paymentStatus === 'full' ? t('paymentFull') : t('paymentPartial')}
										</span>
									</div>
									{cargo.paymentStatus === 'partial' && cargo.partialPaymentDetail && (
										<div className="flex justify-between items-center">
											<span className="text-gray-500 text-xs font-medium">{t('partialPaymentDetailLabel')}</span>
											<span className="text-gray-800 text-xs font-semibold">
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
				<div className="mb-6">
					<p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mb-3">{t('stagesLabel')}</p>
					<div className="space-y-2">
						{steps.map((step, i) => {
							const currentIdx = getStepIndex(cargo.status)
							const done = i <= currentIdx
							const active = i === currentIdx
							return (
								<div
									key={step.status}
									className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-semibold border transition-all ${
										active
											? 'bg-orange-50 border-orange-200 text-orange-700'
											: done
												? 'bg-emerald-50 border-emerald-200 text-emerald-700'
												: 'bg-gray-50 border-gray-200 text-gray-400'
									}`}>
									<span className={`text-sm ${!done && !active ? 'opacity-40' : ''}`}>{step.icon}</span>
									<span>{step.label}</span>
									{done && !active && <span className="ml-auto">✓</span>}
									{active && <span className="ml-auto w-2 h-2 rounded-full bg-orange-400 animate-pulse" />}
								</div>
							)
						})}
					</div>
				</div>

				<button
					onClick={onNewSearch}
					className="w-full bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 px-6 py-3 rounded-xl text-sm font-bold transition-all hover:shadow-sm active:scale-[0.98]">
					{t('newSearchButton')}
				</button>
			</div>
		</div>
	)
}
