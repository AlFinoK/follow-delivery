'use client'

import { use, useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Pencil, Copy, Check, Trash2, Package, MapPin, ArrowRight } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { ToastItem } from '@/components/Toast'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { DeleteModal } from '@/components/admin/DeleteModal'
import { ConfirmModal } from '@/components/admin/ConfirmModal'
import { PageLoader } from '@/components/PageLoader'
import { CitySelect, StatusSelect, PaymentSelect, CurrencySelect } from '@/components/admin/Selects'
import { DatePickerField } from '@/components/admin/DatePickerField'
import { TimeframeInput } from '@/components/admin/TimeframeInput'
import { Spinner } from '@/components/Spinner'
import { formatDate, toInputDate, getCurrencySymbol, displayTimeframe } from '@/lib/format'
import type { Toast } from '@/components/Toast'
import type { Cargo } from '@/components/admin/types'

interface DraftState {
	cargoNumber: string
	name: string
	fromCity: string
	currentCity: string
	toCity: string
	acceptanceDate: string
	shipmentDate: string
	deliveryTimeframe: string
	deliveryAmount: string
	currency: string
	paymentStatus: string
	partialPaymentDetail: string
	status: string
}

function cargoToDraft(cargo: Cargo): DraftState {
	return {
		cargoNumber: cargo.cargoNumber != null ? String(cargo.cargoNumber) : '',
		name: cargo.name ?? '',
		fromCity: cargo.fromCity,
		currentCity: cargo.currentCity,
		toCity: cargo.toCity,
		acceptanceDate: toInputDate(cargo.acceptanceDate),
		shipmentDate: toInputDate(cargo.shipmentDate),
		deliveryTimeframe: cargo.deliveryTimeframe ?? '',
		deliveryAmount: cargo.deliveryAmount?.toString() ?? '',
		currency: cargo.currency ?? 'KZT',
		paymentStatus: cargo.paymentStatus ?? 'none',
		partialPaymentDetail: cargo.partialPaymentDetail ?? '',
		status: cargo.status,
	}
}

const INPUT_CLS =
	'w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 text-sm font-medium placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all'

function statusConfig(status: string, t: (k: any) => string) {
	if (status === 'в пути')
		return { label: t('statusInTransit'), cls: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' }
	if (status === 'прибыл')
		return { label: t('statusArrived'), cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' }
	return { label: t('statusWaiting'), cls: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' }
}

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
	<p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">{children}</p>
)

// На мобиле в view-mode поле — row (label слева, value справа). В edit-mode и на десктопе — stack.
const Field = ({ editMode, children }: { editMode: boolean; children: React.ReactNode }) => (
	<div className={editMode ? 'space-y-1.5' : 'flex items-center justify-between gap-3 lg:block lg:space-y-1.5'}>
		{children}
	</div>
)

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
	<p className="text-xs font-medium text-slate-700">{children}</p>
)

const FieldValue = ({ children, empty }: { children: React.ReactNode; empty?: boolean }) => (
	<p className={`text-sm font-medium text-right lg:text-left ${empty ? 'text-slate-400 italic' : 'text-slate-900'}`}>{children}</p>
)

export default function CargoDetailPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = use(params)
	const { t } = useLang()
	const router = useRouter()
	const searchParams = useSearchParams()
	const backToList = () => {
		const returnTo = searchParams.get('returnTo')
		if (returnTo) { router.push(returnTo); return }
		const qs = searchParams.toString()
		router.push(qs ? `/admin?${qs}` : '/admin')
	}
	const [mounted, setMounted] = useState(false)
	const [cargo, setCargo] = useState<Cargo | null>(null)
	const [loading, setLoading] = useState(true)
	const [minLoadDone, setMinLoadDone] = useState(false)
	const [saving, setSaving] = useState(false)
	const [editMode, setEditMode] = useState(false)
	const [draft, setDraft] = useState<DraftState | null>(null)
	const [toasts, setToasts] = useState<Toast[]>([])
	const [copied, setCopied] = useState(false)
	const [showDeleteModal, setShowDeleteModal] = useState(false)
	const [showArrivedConfirm, setShowArrivedConfirm] = useState(false)

	const addToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
		const tid = Date.now().toString()
		setToasts((prev) => [...prev, { id: tid, message, type }])
		setTimeout(() => {
			setToasts((prev) => prev.map((t) => (t.id === tid ? { ...t, exiting: true } : t)))
			setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== tid)), 350)
		}, 5000)
	}, [])

	const loadCargo = useCallback(async () => {
		try {
			const res = await fetch(`/api/cargos/${id}`)
			if (res.status === 404) { backToList(); return }
			if (!res.ok) throw new Error()
			setCargo(await res.json())
		} catch {
			addToast(t('loadError'), 'error')
		} finally {
			setLoading(false)
		}
	}, [id, router, addToast, t])

	useEffect(() => {
		setMounted(true)
		loadCargo()
		const timer = setTimeout(() => setMinLoadDone(true), 444)
		return () => clearTimeout(timer)
	}, [loadCargo])

	const startEdit = () => { if (!cargo) return; setDraft(cargoToDraft(cargo)); setEditMode(true) }
	const cancelEdit = () => { setDraft(null); setEditMode(false) }
	const setField = <K extends keyof DraftState>(key: K, value: DraftState[K]) =>
		setDraft((d) => d && { ...d, [key]: value })

	const performSave = async () => {
		if (!cargo || !draft) return
		setSaving(true)
		try {
			const res = await fetch(`/api/cargos/${cargo.docId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					cargoNumber: draft.cargoNumber.trim() ? Number(draft.cargoNumber.trim()) : null,
					name: draft.name.trim() || null,
					fromCity: draft.fromCity.trim(),
					currentCity: draft.currentCity.trim(),
					toCity: draft.toCity.trim(),
					status: draft.status,
					acceptanceDate: draft.acceptanceDate || null,
					shipmentDate: draft.shipmentDate || null,
					deliveryTimeframe: draft.deliveryTimeframe || null,
					deliveryAmount: draft.deliveryAmount ? Number(draft.deliveryAmount) : null,
					currency: draft.currency,
					paymentStatus: draft.paymentStatus,
					partialPaymentDetail: draft.paymentStatus === 'partial' ? draft.partialPaymentDetail || null : null,
				}),
			})
			if (!res.ok) throw new Error()
			setCargo(await res.json())
			setEditMode(false)
			setDraft(null)
			addToast(t('detailsUpdated'), 'success')
		} catch {
			addToast(t('detailsUpdateError'), 'error')
		} finally {
			setSaving(false)
		}
	}

	const handleSave = () => {
		if (!cargo || !draft) return
		if (!draft.fromCity.trim() || !draft.currentCity.trim() || !draft.toCity.trim()) { addToast(t('cityEmpty'), 'error'); return }
		// Подтверждение при первой смене статуса на "прибыл" (без него легко промахнуться в селекте).
		if (cargo.status !== 'прибыл' && draft.status === 'прибыл') {
			setShowArrivedConfirm(true)
			return
		}
		void performSave()
	}

	const handleDelete = async () => {
		if (!cargo) return
		const res = await fetch(`/api/cargos/${cargo.docId}`, { method: 'DELETE' })
		if (!res.ok) { addToast(t('deleteError'), 'error'); return }
		sessionStorage.setItem('pendingToast', JSON.stringify({ message: t('cargoDeleted'), type: 'success' }))
		backToList()
	}

	const handleCopy = () => {
		if (!cargo) return
		navigator.clipboard.writeText(cargo.id)
		setCopied(true)
		setTimeout(() => setCopied(false), 2000)
	}

	if (!mounted) return <div suppressHydrationWarning />

	const currSym = getCurrencySymbol(cargo?.currency ?? 'KZT')
	const draftSym = getCurrencySymbol(draft?.currency ?? 'KZT')
	const d = draft!

	return (
		<div className="min-h-screen bg-slate-50" suppressHydrationWarning>
			<AdminSidebar />

			<div className="lg:ml-64 min-h-screen flex flex-col">
				<div className="fixed top-20 lg:top-4 right-4 z-50 flex flex-col gap-2 max-w-xs">
					{toasts.map((toast) => (
						<ToastItem key={toast.id} toast={toast} />
					))}
				</div>

				{(loading || !minLoadDone) && <PageLoader />}

				{!loading && minLoadDone && cargo && (
				<main className="flex-1 overflow-y-auto">
					<div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
						{/* Back + title */}
						<div className="flex items-center justify-between gap-3 mb-5">
							<button
								onClick={backToList}
								className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-900 font-medium text-sm transition-colors">
								<ArrowLeft className="w-4 h-4" />
								{t('backToList')}
							</button>
							<h1 className="text-lg font-semibold text-slate-900">{t('cargoDetailTitle')}</h1>
						</div>

						{/* Main card */}
						<div className="bg-white rounded-xl shadow-sm border border-slate-200">
							<div className="p-5 sm:p-6 flex flex-col gap-6">

								{/* Cargo name + track ID + edit btn */}
								<div className="flex items-start justify-between gap-4">
									<div className="flex-1 min-w-0">
										{editMode ? (
											<div className="flex gap-2">
												<div className="w-24 shrink-0">
													<FieldLabel>{t('cargoNumberLabel')}</FieldLabel>
													<input
														type="number"
														min="0"
														step="1"
														value={d.cargoNumber}
														onChange={(e) => setField('cargoNumber', e.target.value)}
														placeholder={t('enterCargoNumber')}
														className={INPUT_CLS}
													/>
												</div>
												<div className="flex-1 min-w-0">
													<FieldLabel>{t('cargoNameCardLabel')}</FieldLabel>
													<input
														type="text"
														value={d.name}
														onChange={(e) => setField('name', e.target.value)}
														placeholder={t('enterName')}
														autoFocus
														className={INPUT_CLS}
													/>
												</div>
											</div>
										) : (
											<div>
												<h2 className="text-xl font-semibold text-slate-900 leading-snug break-words">
													{cargo.cargoNumber != null && (
														<span className="text-orange-600 mr-2">№{cargo.cargoNumber}</span>
													)}
													{cargo.name || <span className="text-slate-400 italic font-medium text-base">{t('noName')}</span>}
												</h2>
												<button
													onClick={handleCopy}
													className={`inline-flex items-center gap-1.5 text-xs font-mono mt-2 transition-colors max-w-full min-w-0 ${copied ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-700'}`}>
													<span className="truncate">{copied ? t('copied') : cargo.id}</span>
													{copied ? <Check className="w-3.5 h-3.5 shrink-0" /> : <Copy className="w-3.5 h-3.5 shrink-0" />}
												</button>
											</div>
										)}
									</div>
									{!editMode && (
										<button
											onClick={startEdit}
											className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shrink-0"
											title={t('editButton')}>
											<Pencil className="w-3.5 h-3.5" />
											<span className="hidden sm:inline">{t('editButton')}</span>
										</button>
									)}
								</div>

								{/* Route bar */}
								<div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
									<div className="flex items-center gap-2">
										<div className="flex-1 min-w-0 text-center">
											<Package className="w-4 h-4 text-slate-400 mx-auto mb-1.5" />
											<p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-0.5">{t('fromCardLabel')}</p>
											<p className="text-xs font-semibold text-slate-900 truncate">{editMode ? d.fromCity || cargo.fromCity : cargo.fromCity}</p>
										</div>
										<ArrowRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
										<div className="flex-1 min-w-0 text-center">
											<MapPin className="w-4 h-4 text-orange-500 mx-auto mb-1.5" />
											<p className="text-[10px] font-medium text-orange-600 uppercase tracking-wide mb-0.5">{t('currentLabel')}</p>
											<p className="text-xs font-semibold text-slate-900 truncate">{editMode ? d.currentCity || cargo.currentCity : cargo.currentCity}</p>
										</div>
										<ArrowRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
										<div className="flex-1 min-w-0 text-center">
											<Check className="w-4 h-4 text-slate-400 mx-auto mb-1.5" />
											<p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-0.5">{t('toCardLabel')}</p>
											<p className="text-xs font-semibold text-slate-900 truncate">{editMode ? d.toCity || cargo.toCity : cargo.toCity}</p>
										</div>
									</div>
								</div>

								{/* Маршрут */}
								<div>
									<SectionTitle>Маршрут</SectionTitle>
									<div className="grid grid-cols-1 gap-2 lg:grid-cols-3 lg:gap-3">
										<Field editMode={editMode}>
											<FieldLabel>{t('fromCardLabel')}</FieldLabel>
											{editMode
												? <CitySelect value={d.fromCity} onChange={(v) => setField('fromCity', v)} />
												: <FieldValue>{cargo.fromCity}</FieldValue>}
										</Field>
										<Field editMode={editMode}>
											<FieldLabel>{t('toCardLabel')}</FieldLabel>
											{editMode
												? <CitySelect value={d.toCity} onChange={(v) => setField('toCity', v)} />
												: <FieldValue>{cargo.toCity}</FieldValue>}
										</Field>
										<Field editMode={editMode}>
											<FieldLabel>{t('currentLocationLabel')}</FieldLabel>
											{editMode
												? <CitySelect value={d.currentCity} onChange={(v) => setField('currentCity', v)} />
												: <FieldValue>{cargo.currentCity}</FieldValue>}
										</Field>
										<Field editMode={editMode}>
											<FieldLabel>{t('statusCardLabel')}</FieldLabel>
											{editMode ? (
												<StatusSelect value={d.status} onChange={(v) => setField('status', v)} />
											) : (
												(() => {
													const cfg = statusConfig(cargo.status, t)
													return (
														<span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${cfg.cls}`}>
															<span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
															{cfg.label}
														</span>
													)
												})()
											)}
										</Field>
									</div>
								</div>

								{/* Даты */}
								<div>
									<SectionTitle>Даты</SectionTitle>
									<div className="grid grid-cols-1 gap-2 lg:grid-cols-3 lg:gap-3">
										<Field editMode={editMode}>
											<FieldLabel>{t('acceptanceDateLabel')}</FieldLabel>
											{editMode
												? <DatePickerField value={d.acceptanceDate} onChange={(v) => setField('acceptanceDate', v)} />
												: <FieldValue empty={!cargo.acceptanceDate}>{cargo.acceptanceDate ? formatDate(cargo.acceptanceDate) : t('notSpecified')}</FieldValue>}
										</Field>
										<Field editMode={editMode}>
											<FieldLabel>{t('shipmentDateLabel')}</FieldLabel>
											{editMode
												? <DatePickerField value={d.shipmentDate} onChange={(v) => setField('shipmentDate', v)} />
												: <FieldValue empty={!cargo.shipmentDate}>{cargo.shipmentDate ? formatDate(cargo.shipmentDate) : t('notSpecified')}</FieldValue>}
										</Field>
									</div>
								</div>

								{/* Оплата и доставка */}
								<div>
									<SectionTitle>Оплата и доставка</SectionTitle>
									<div className="grid grid-cols-1 gap-2 lg:grid-cols-3 lg:gap-3">
										<Field editMode={editMode}>
											<FieldLabel>{t('deliveryTimeframeLabel')}</FieldLabel>
											{editMode
												? <TimeframeInput value={d.deliveryTimeframe} onChange={(v) => setField('deliveryTimeframe', v)} />
												: <FieldValue empty={!cargo.deliveryTimeframe}>{cargo.deliveryTimeframe ? displayTimeframe(cargo.deliveryTimeframe, t) : t('notSpecified')}</FieldValue>}
										</Field>
										<Field editMode={editMode}>
											<FieldLabel>{t('deliveryAmountLabel')}</FieldLabel>
											{editMode ? (
												<div className="flex gap-2">
													<input type="number" min="0" value={d.deliveryAmount} onChange={(e) => setField('deliveryAmount', e.target.value)} placeholder={t('enterAmount')} className={`${INPUT_CLS} flex-1 min-w-0`} />
													<div className="w-32 shrink-0"><CurrencySelect value={d.currency} onChange={(v) => setField('currency', v)} /></div>
												</div>
											) : (
												<FieldValue empty={cargo.deliveryAmount == null}>
													{cargo.deliveryAmount != null ? `${cargo.deliveryAmount.toLocaleString()} ${currSym}` : t('notSpecified')}
												</FieldValue>
											)}
										</Field>
										<Field editMode={editMode}>
											<FieldLabel>{t('paymentStatusLabel')}</FieldLabel>
											{editMode ? (
												<PaymentSelect value={d.paymentStatus} onChange={(v) => setDraft((prev) => prev ? { ...prev, paymentStatus: v, partialPaymentDetail: v !== 'partial' ? '' : prev.partialPaymentDetail } : prev)} />
											) : (
												<span className={`inline-flex text-xs font-semibold px-2.5 py-1 rounded-md ${cargo.paymentStatus === 'full' ? 'bg-emerald-50 text-emerald-700' : cargo.paymentStatus === 'partial' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
													{cargo.paymentStatus === 'full' ? t('paymentFull') : cargo.paymentStatus === 'partial' ? t('paymentPartial') : t('paymentNone')}
												</span>
											)}
										</Field>
										{(editMode ? d.paymentStatus === 'partial' : cargo.paymentStatus === 'partial') && (
											<Field editMode={editMode}>
												<FieldLabel>{t('partialPaymentDetailLabel')}</FieldLabel>
												{editMode ? (
													<div className="flex items-center gap-2">
														<input type="number" min="0" value={d.partialPaymentDetail} onChange={(e) => setField('partialPaymentDetail', e.target.value)} placeholder={t('enterAmount')} className={`${INPUT_CLS} flex-1`} />
														<span className="text-slate-500 font-medium text-sm shrink-0">{draftSym}</span>
													</div>
												) : (
													<FieldValue empty={!cargo.partialPaymentDetail}>
														{cargo.partialPaymentDetail ? `${!isNaN(Number(cargo.partialPaymentDetail)) ? Number(cargo.partialPaymentDetail).toLocaleString() : cargo.partialPaymentDetail} ${currSym}` : t('notSpecified')}
													</FieldValue>
												)}
											</Field>
										)}
									</div>
								</div>

								{/* Edit actions */}
								{editMode && (
									<div className="border-t border-slate-200 pt-4 flex items-center justify-end gap-2">
										<button onClick={cancelEdit} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors">
											{t('cancelButton')}
										</button>
										<button onClick={handleSave} disabled={saving} className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors disabled:opacity-60">
											{saving ? <Spinner className="w-4 h-4 text-white" /> : <Check className="w-4 h-4" />}
											{t('saveButton')}
										</button>
									</div>
								)}
							</div>
						</div>

						{/* Danger zone */}
						<div className="mt-5 bg-white rounded-xl border border-red-200">
							<div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3">
								<div className="flex-1 min-w-0">
									<p className="text-sm font-semibold text-red-700">{t('dangerZoneTitle')}</p>
									<p className="text-xs text-slate-500 mt-0.5">{t('dangerZoneDescription')}</p>
								</div>
								<button
									onClick={() => setShowDeleteModal(true)}
									className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-red-700 bg-white hover:bg-red-50 border border-red-200 rounded-lg transition-colors shrink-0">
									<Trash2 className="w-4 h-4" />
									{t('deleteButton')}
								</button>
							</div>
						</div>
					</div>
				</main>
			)}
			</div>

			<DeleteModal
				isOpen={showDeleteModal}
				itemName={cargo?.name || t('noName')}
				itemId={cargo?.id}
				onCancel={() => setShowDeleteModal(false)}
				onConfirm={() => { setShowDeleteModal(false); handleDelete() }}
			/>

			<ConfirmModal
				isOpen={showArrivedConfirm}
				title={t('confirmArrivedTitle')}
				description={t('confirmArrivedDescription')}
				confirmLabel={t('confirmArrivedYes')}
				onCancel={() => setShowArrivedConfirm(false)}
				onConfirm={() => { setShowArrivedConfirm(false); void performSave() }}
			/>
		</div>
	)
}
