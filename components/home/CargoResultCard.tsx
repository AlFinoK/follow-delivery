'use client'

import { Package, MapPin, Truck, Clock, CheckCircle2, ArrowRight, RotateCcw } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { formatDate, formatMoney, formatPaymentDetail, displayTimeframe } from '@/lib/format'
import { getStatusUi, statusKind, type CargoStatusKind } from '@/components/admin/statusUi'

interface CargoData {
	id: string
	name?: string
	fromCity: string
	currentCity: string
	toCity: string
	status: string
	createdAt?: string | Date | null
	acceptanceDate?: string | null
	shipmentDate?: string | null
	deliveryTimeframe?: string | null
	deliveryAmount?: number | null
	paymentStatus?: string | null
	partialPaymentDetail?: string | null
	currency?: string | null
}

// Порядок этапов на таймлайне; у неизвестного статуса индекс -1 (ни один этап не подсвечен).
const STEP_ORDER: CargoStatusKind[] = ['waiting', 'transit', 'arrived']

const STATUS_ICONS: Record<CargoStatusKind, typeof Clock> = {
	waiting: Clock,
	transit: Truck,
	arrived: CheckCircle2,
	unknown: Clock,
}

// Цвета статуса на публичной карточке — ОДНИ И ТЕ ЖЕ для бейджа и для активного этапа
// таймлайна (раньше бейдж «в пути» был синим из statusUi, а этап — оранжевым).
// Локально, а не в statusUi.ts: в админке синий «в пути» отличает его от «ожидает» в списке.
// Публичная страница всегда светлая, поэтому dark:-классы здесь не нужны.
const KIND_PALETTE: Record<Exclude<CargoStatusKind, 'unknown'>, { badge: string; dot: string; step: string; iconBox: string }> = {
	waiting: {
		badge: 'bg-amber-50 text-amber-700 border-amber-200',
		dot: 'bg-amber-500',
		step: 'bg-amber-50 border-amber-200 text-amber-700',
		iconBox: 'bg-amber-50 text-amber-600',
	},
	transit: {
		badge: 'bg-orange-50 text-orange-700 border-orange-200',
		dot: 'bg-orange-500',
		step: 'bg-orange-50 border-orange-200 text-orange-700',
		iconBox: 'bg-orange-50 text-orange-600',
	},
	arrived: {
		badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
		dot: 'bg-emerald-500',
		step: 'bg-emerald-50 border-emerald-200 text-emerald-700',
		iconBox: 'bg-emerald-50 text-emerald-600',
	},
}

function getStepIndex(status: string) {
	return STEP_ORDER.indexOf(statusKind(status))
}

// Названия городов — русские данные из БД: lang="ru" + hyphens-auto, чтобы длинное слово
// переносилось по слогам («Петропав-ловск»), а не по произвольной букве. break-words —
// последний рубеж для строк без точек переноса: ничего не вылезает за карточку.
const CITY_TEXT = 'font-semibold text-slate-900 leading-tight break-words hyphens-auto'

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

	const stops = [
		{ key: 'from', Icon: Package, label: t('fromLabel'), city: cargo.fromCity, accent: false },
		{ key: 'current', Icon: MapPin, label: t('currentLabel'), city: cargo.currentCity || cargo.fromCity, accent: true },
		{ key: 'to', Icon: CheckCircle2, label: t('toLabel'), city: cargo.toCity, accent: false },
	]

	const paymentDetail = formatPaymentDetail(cargo.partialPaymentDetail, cargo.currency)

	const hasDetails =
		cargo.acceptanceDate ||
		cargo.shipmentDate ||
		cargo.deliveryTimeframe ||
		cargo.deliveryAmount != null ||
		(cargo.paymentStatus && cargo.paymentStatus !== 'none')

	const ui = getStatusUi(cargo.status, t)
	const palette = ui.kind === 'unknown' ? null : KIND_PALETTE[ui.kind]
	const badgeCls = palette ? palette.badge : ui.cls
	const badgeDot = palette ? palette.dot : ui.dot
	const StatusIcon = STATUS_ICONS[ui.kind]
	const currentIdx = getStepIndex(cargo.status)

	return (
		<div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
			<div className="p-4 sm:p-7 flex flex-col gap-4 sm:gap-5">
				{/* Status header */}
				<div className="flex items-start gap-3">
					<div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${palette ? palette.iconBox : 'bg-slate-50 text-slate-500'}`}>
						<StatusIcon className="w-5 h-5" />
					</div>
					<div className="flex-1 min-w-0">
						<p className="text-xs font-medium text-slate-500 mb-1">{t('cargoStatusLabel')}</p>
						<span
							className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold border ${badgeCls}`}>
							<span className={`w-1.5 h-1.5 rounded-full ${badgeDot}`} />
							{ui.label}
						</span>
					</div>
				</div>

				{/* Track ID */}
				<div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
					<p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">{t('trackNumberLabel')}</p>
					<p className="font-mono text-xs text-slate-700 break-words">{cargo.id}</p>
				</div>

				{/* Route */}
				<div className="bg-slate-50 border border-slate-200 rounded-lg p-3 sm:p-4">
					<p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3">{t('routeLabel')}</p>

					{/* Телефон: столбик «откуда → сейчас → куда». В три колонки по ~100 px название
					    вроде «Петропавловск» не помещается целиком и рвалось посреди слова. */}
					<ol className="sm:hidden">
						{stops.map(({ key, Icon, label, city, accent }, i) => (
							<li key={key} className="flex gap-3">
								<div className="flex flex-col items-center">
									<span
										className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 ${
											accent ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-200'
										}`}>
										<Icon className={`w-3.5 h-3.5 ${accent ? 'text-orange-500' : 'text-slate-400'}`} />
									</span>
									{i < stops.length - 1 && <span className="w-px flex-1 min-h-2 bg-slate-200 my-1" aria-hidden />}
								</div>
								<div className={`min-w-0 flex-1 pt-0.5 ${i < stops.length - 1 ? 'pb-2.5' : ''}`}>
									<p className={`text-[10px] font-medium uppercase ${accent ? 'text-orange-600' : 'text-slate-500'}`}>{label}</p>
									<p lang="ru" className={`text-sm ${CITY_TEXT}`}>
										{city}
									</p>
								</div>
							</li>
						))}
					</ol>

					{/* sm+: три колонки со стрелками */}
					<div className="hidden sm:flex items-start gap-2">
						{stops.map(({ key, Icon, label, city, accent }, i) => (
							<div key={key} className="contents">
								{i > 0 && <ArrowRight className="w-3.5 h-3.5 text-slate-300 shrink-0 mt-1" />}
								<div className="flex-1 min-w-0 text-center">
									<Icon className={`w-4 h-4 mx-auto mb-1.5 ${accent ? 'text-orange-500' : 'text-slate-400'}`} />
									<p className={`text-[10px] font-medium uppercase mb-0.5 ${accent ? 'text-orange-600' : 'text-slate-500'}`}>{label}</p>
									<p lang="ru" className={`text-sm ${CITY_TEXT}`}>
										{city}
									</p>
								</div>
							</div>
						))}
					</div>
				</div>

				{/* Details */}
				{hasDetails && (
					<div className="bg-slate-50 border border-slate-200 rounded-lg p-3 sm:p-4">
						<p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3">{t('detailsLabel')}</p>
						<div className="space-y-2">
							{cargo.acceptanceDate && (
								<div className="flex justify-between items-center gap-3 text-xs">
									<span className="text-slate-500">{t('acceptanceDateLabel')}</span>
									<span className="text-slate-900 font-medium">{formatDate(cargo.acceptanceDate)}</span>
								</div>
							)}
							{cargo.shipmentDate && (
								<div className="flex justify-between items-center gap-3 text-xs">
									<span className="text-slate-500">{t('shipmentDateLabel')}</span>
									<span className="text-slate-900 font-medium">{formatDate(cargo.shipmentDate)}</span>
								</div>
							)}
							{cargo.deliveryTimeframe && (
								<div className="flex justify-between items-center gap-3 text-xs">
									<span className="text-slate-500">{t('deliveryTimeframeLabel')}</span>
									<span className="text-slate-900 font-medium">{displayTimeframe(cargo.deliveryTimeframe, t)}</span>
								</div>
							)}
							{cargo.deliveryAmount != null && (
								<div className="flex justify-between items-center gap-3 text-xs">
									<span className="text-slate-500">{t('deliveryAmountLabel')}</span>
									<span className="text-slate-900 font-medium whitespace-nowrap">
										{formatMoney(cargo.deliveryAmount, cargo.currency)}
									</span>
								</div>
							)}
							{cargo.paymentStatus && cargo.paymentStatus !== 'none' && (
								<>
									<div className="flex justify-between items-center gap-3 text-xs">
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
									{/* Свободный текст: валюту дописываем, только если там одно число
									    (formatPaymentDetail), иначе было «Оплачено 50 000 ₸ ₸». */}
									{cargo.paymentStatus === 'partial' && paymentDetail && (
										<div className="flex justify-between items-start gap-3 text-xs">
											<span className="text-slate-500 shrink-0">{t('partialPaymentDetailLabel')}</span>
											<span className="text-slate-900 font-medium text-right min-w-0 break-words">{paymentDetail}</span>
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
							// Активный этап — тем же цветом, что и бейдж статуса выше
							const activeCls = palette ? palette.step : 'bg-orange-50 border-orange-200 text-orange-700'
							const activeDot = palette ? palette.dot : 'bg-orange-500'
							const isLast = i === steps.length - 1
							return (
								<div
									key={step.status}
									className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium border ${
										active
											? activeCls
											: done
												? 'bg-emerald-50 border-emerald-200 text-emerald-700'
												: 'bg-slate-50 border-slate-200 text-slate-400'
									}`}>
									<Icon className={`w-3.5 h-3.5 shrink-0 ${!done && !active ? 'opacity-50' : ''}`} />
									<span>{step.label}</span>
									{done && !active && <CheckCircle2 className="ml-auto w-3.5 h-3.5" />}
									{/* «Прибыл» — конечный этап: пульсирующая точка («идёт») там неуместна */}
									{active && isLast && <CheckCircle2 className="ml-auto w-3.5 h-3.5" />}
									{active && !isLast && <span className={`ml-auto w-1.5 h-1.5 rounded-full ${activeDot} animate-pulse`} />}
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
