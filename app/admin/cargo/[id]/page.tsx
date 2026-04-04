'use client'

import { use, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/contexts/LangContext'
import { ToastItem } from '@/components/Toast'
import { AdminNav } from '@/components/admin/AdminNav'
import { DeleteModal } from '@/components/admin/DeleteModal'
import { PageLoader } from '@/components/PageLoader'
import { CitySelect, StatusSelect, PaymentSelect, CurrencySelect } from '@/components/admin/Selects'
import { DatePickerField } from '@/components/admin/DatePickerField'
import { TimeframeInput } from '@/components/admin/TimeframeInput'
import { formatDate, toInputDate, getCurrencySymbol, displayTimeframe } from '@/lib/format'
import type { Toast } from '@/components/Toast'
import type { Cargo } from '@/components/admin/types'

interface DraftState {
	name: string
	currentCity: string
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
		name: cargo.name ?? '',
		currentCity: cargo.currentCity,
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
	'w-full px-3 py-2.5 bg-gray-50 border-2 border-orange-200 rounded-xl text-gray-900 text-sm font-medium placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-400/30 transition-all'

function statusConfig(status: string, t: (k: any) => string) {
	if (status === 'в пути')
		return { label: t('statusInTransit'), cls: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-500' }
	if (status === 'прибыл')
		return { label: t('statusArrived'), cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' }
	return { label: t('statusWaiting'), cls: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500' }
}

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
	<p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">{children}</p>
)

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
	<p className="text-orange-600 text-xs font-bold mb-2 tracking-wide">{children}</p>
)

const FieldValue = ({ children, empty }: { children: React.ReactNode; empty?: boolean }) => (
	<p className={`text-sm font-semibold ${empty ? 'text-gray-400 italic' : 'text-gray-900'}`}>{children}</p>
)

export default function CargoDetailPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = use(params)
	const { t } = useLang()
	const router = useRouter()
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
			if (res.status === 404) { router.push('/admin'); return }
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

	const handleSave = async () => {
		if (!cargo || !draft) return
		if (!draft.currentCity.trim()) { addToast(t('cityEmpty'), 'error'); return }
		setSaving(true)
		try {
			const res = await fetch(`/api/cargos/${cargo.docId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: draft.name.trim() || null,
					currentCity: draft.currentCity.trim(),
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

	const handleDelete = async () => {
		if (!cargo) return
		const res = await fetch(`/api/cargos/${cargo.docId}`, { method: 'DELETE' })
		if (!res.ok) { addToast(t('deleteError'), 'error'); return }
		sessionStorage.setItem('pendingToast', JSON.stringify({ message: t('cargoDeleted'), type: 'success' }))
		router.push('/admin')
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
		<div
			className="h-screen flex flex-col bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 overflow-hidden"
			suppressHydrationWarning>
			<div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-xs">
				{toasts.map((toast) => (
					<ToastItem key={toast.id} toast={toast} />
				))}
			</div>

			<AdminNav />

			{(loading || !minLoadDone) && <PageLoader />}

			{!loading && minLoadDone && cargo && (
				<main className="flex-1 overflow-y-auto">
					<div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
						{/* Back + title */}
						<div className="flex items-center justify-between gap-3 mb-6">
							<button
								onClick={() => router.push('/admin')}
								className="flex items-center gap-1.5 text-orange-600 hover:text-orange-700 font-semibold text-sm transition-colors flex-shrink-0">
								<svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
									<path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
								</svg>
								{t('backToList')}
							</button>
							<div className="flex items-center gap-2">
								<span className="text-xl">📦</span>
								<h1 className="text-xl font-black text-gray-900">{t('cargoDetailTitle')}</h1>
							</div>
						</div>

						{/* Main card */}
						<div className="bg-white rounded-2xl shadow-lg border border-orange-100">
							<div className="h-1.5 rounded-t-2xl bg-gradient-to-r from-amber-400 to-orange-500" />

							<div className="p-4 sm:p-8 flex flex-col gap-6">

								{/* ── Cargo name + track ID + edit btn ── */}
								<div className="flex items-start justify-between gap-4">
									<div className="flex-1 min-w-0">
										{editMode ? (
											<div>
												<FieldLabel>{t('cargoNameCardLabel')}</FieldLabel>
												<input
													type="text"
													value={d.name}
													onChange={(e) => setField('name', e.target.value)}
													placeholder={t('enterName')}
													autoFocus
													className="w-full px-3 py-2.5 text-base font-bold text-gray-900 bg-gray-50 border-2 border-orange-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-400/30 rounded-xl outline-none placeholder-gray-400 transition-all"
												/>
											</div>
										) : (
											<h2 className="text-xl sm:text-2xl font-black text-gray-900 leading-snug truncate">
												{cargo.name || <span className="text-gray-400 italic font-semibold text-lg">{t('noName')}</span>}
											</h2>
										)}
										<button
											onClick={handleCopy}
											className={`flex items-center gap-1.5 text-xs font-mono mt-1.5 transition-colors max-w-full min-w-0 ${copied ? 'text-emerald-600 font-bold' : 'text-gray-400 hover:text-orange-500'}`}>
											{copied ? (
												<><span className="truncate">{t('copied')}</span><svg className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg></>
											) : (
												<><span className="truncate">{cargo.id}</span><svg className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" /><path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" /></svg></>
											)}
										</button>
									</div>
									{!editMode && (
										<button
											onClick={startEdit}
											className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl transition-colors">
											<svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
												<path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
											</svg>
											{t('editButton')}
										</button>
									)}
								</div>

								{/* ── Route bar ── */}
								<div className="bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 border border-orange-100 rounded-xl p-3 sm:p-4">
									<div className="flex items-start gap-1 sm:gap-3">
										<div className="flex-1 min-w-0 text-center">
											<div className="w-7 h-7 sm:w-8 sm:h-8 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-1"><span className="text-xs sm:text-sm">📤</span></div>
											<p className="text-[8px] sm:text-[9px] font-black text-orange-500 uppercase tracking-wide mb-0.5 truncate">{t('fromCardLabel')}</p>
											<p className="text-xs font-bold text-gray-900 truncate">{cargo.fromCity}</p>
										</div>
										<div className="flex items-center self-center pb-4 shrink-0">
											<div className="w-2 sm:w-5 h-px bg-orange-200" /><span className="text-orange-400 text-xs">›</span><div className="w-2 sm:w-5 h-px bg-orange-200" />
										</div>
										<div className="flex-1 min-w-0 text-center">
											<div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-1"><span className="text-xs sm:text-sm">📍</span></div>
											<p className="text-[8px] sm:text-[9px] font-black text-blue-500 uppercase tracking-wide mb-0.5 truncate">{t('currentLocationLabel')}</p>
											<p className="text-xs font-bold text-gray-900 truncate">{editMode ? d.currentCity || cargo.currentCity : cargo.currentCity}</p>
										</div>
										<div className="flex items-center self-center pb-4 shrink-0">
											<div className="w-2 sm:w-5 h-px bg-orange-200" /><span className="text-orange-400 text-xs">›</span><div className="w-2 sm:w-5 h-px bg-orange-200" />
										</div>
										<div className="flex-1 min-w-0 text-center">
											<div className="w-7 h-7 sm:w-8 sm:h-8 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-1"><span className="text-xs sm:text-sm">📥</span></div>
											<p className="text-[8px] sm:text-[9px] font-black text-emerald-600 uppercase tracking-wide mb-0.5 truncate">{t('toCardLabel')}</p>
											<p className="text-xs font-bold text-gray-900 truncate">{cargo.toCity}</p>
										</div>
									</div>
								</div>

								<div className="border-t border-orange-100" />

								{/* ── Маршрут ── */}
								<div>
									<SectionTitle>Маршрут</SectionTitle>
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
										<div>
											<FieldLabel>{t('currentLocationLabel')}</FieldLabel>
											{editMode
												? <CitySelect value={d.currentCity} onChange={(v) => setField('currentCity', v)} />
												: <FieldValue>{cargo.currentCity}</FieldValue>}
										</div>
										<div>
											<FieldLabel>{t('statusCardLabel')}</FieldLabel>
											{editMode ? (
												<StatusSelect value={d.status} onChange={(v) => setField('status', v)} />
											) : (
												(() => {
													const cfg = statusConfig(cargo.status, t)
													return (
														<span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${cfg.cls}`}>
															<span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
															{cfg.label}
														</span>
													)
												})()
											)}
										</div>
									</div>
								</div>

								{/* ── Даты ── */}
								<div>
									<SectionTitle>Даты</SectionTitle>
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
										<div>
											<FieldLabel>{t('acceptanceDateLabel')}</FieldLabel>
											{editMode
												? <DatePickerField value={d.acceptanceDate} onChange={(v) => setField('acceptanceDate', v)} />
												: <FieldValue empty={!cargo.acceptanceDate}>{cargo.acceptanceDate ? formatDate(cargo.acceptanceDate) : t('notSpecified')}</FieldValue>}
										</div>
										<div>
											<FieldLabel>{t('shipmentDateLabel')}</FieldLabel>
											{editMode
												? <DatePickerField value={d.shipmentDate} onChange={(v) => setField('shipmentDate', v)} />
												: <FieldValue empty={!cargo.shipmentDate}>{cargo.shipmentDate ? formatDate(cargo.shipmentDate) : t('notSpecified')}</FieldValue>}
										</div>
									</div>
								</div>

								{/* ── Оплата и доставка ── */}
								<div>
									<SectionTitle>Оплата и доставка</SectionTitle>
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
										<div>
											<FieldLabel>{t('deliveryTimeframeLabel')}</FieldLabel>
											{editMode
												? <TimeframeInput value={d.deliveryTimeframe} onChange={(v) => setField('deliveryTimeframe', v)} />
												: <FieldValue empty={!cargo.deliveryTimeframe}>{cargo.deliveryTimeframe ? displayTimeframe(cargo.deliveryTimeframe, t) : t('notSpecified')}</FieldValue>}
										</div>
										<div>
											<FieldLabel>{t('deliveryAmountLabel')}</FieldLabel>
											{editMode ? (
												<div className="flex gap-2">
													<input type="number" min="0" value={d.deliveryAmount} onChange={(e) => setField('deliveryAmount', e.target.value)} placeholder={t('enterAmount')} className={`${INPUT_CLS} flex-1 min-w-0`} />
													<div className="w-36 flex-shrink-0"><CurrencySelect value={d.currency} onChange={(v) => setField('currency', v)} /></div>
												</div>
											) : (
												<FieldValue empty={cargo.deliveryAmount == null}>
													{cargo.deliveryAmount != null ? `${cargo.deliveryAmount.toLocaleString()} ${currSym}` : t('notSpecified')}
												</FieldValue>
											)}
										</div>
										<div>
											<FieldLabel>{t('paymentStatusLabel')}</FieldLabel>
											{editMode ? (
												<PaymentSelect value={d.paymentStatus} onChange={(v) => setDraft((prev) => prev ? { ...prev, paymentStatus: v, partialPaymentDetail: v !== 'partial' ? '' : prev.partialPaymentDetail } : prev)} />
											) : (
												<span className={`inline-flex text-xs font-bold px-2.5 py-1 rounded-full ${cargo.paymentStatus === 'full' ? 'bg-emerald-100 text-emerald-700' : cargo.paymentStatus === 'partial' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
													{cargo.paymentStatus === 'full' ? t('paymentFull') : cargo.paymentStatus === 'partial' ? t('paymentPartial') : t('paymentNone')}
												</span>
											)}
										</div>
										{(editMode ? d.paymentStatus === 'partial' : cargo.paymentStatus === 'partial') && (
											<div>
												<FieldLabel>{t('partialPaymentDetailLabel')}</FieldLabel>
												{editMode ? (
													<div className="flex items-center gap-2">
														<input type="number" min="0" value={d.partialPaymentDetail} onChange={(e) => setField('partialPaymentDetail', e.target.value)} placeholder={t('enterAmount')} className={`${INPUT_CLS} flex-1`} />
														<span className="text-gray-500 font-bold text-sm shrink-0">{draftSym}</span>
													</div>
												) : (
													<FieldValue empty={!cargo.partialPaymentDetail}>
														{cargo.partialPaymentDetail ? `${!isNaN(Number(cargo.partialPaymentDetail)) ? Number(cargo.partialPaymentDetail).toLocaleString() : cargo.partialPaymentDetail} ${currSym}` : t('notSpecified')}
													</FieldValue>
												)}
											</div>
										)}
									</div>
								</div>

								{/* ── Actions ── */}
								<div className="border-t border-orange-100 pt-2 flex flex-col-reverse sm:flex-row sm:items-center gap-3">
									<button
										onClick={() => setShowDeleteModal(true)}
										className="flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors">
										{t('deleteButton')}
									</button>
									{editMode && (
										<div className="flex items-center gap-2 sm:ml-auto">
											<button onClick={cancelEdit} className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors text-center">
												{t('cancelButton')}
											</button>
											<button onClick={handleSave} disabled={saving} className="flex-1 sm:flex-none px-5 py-2.5 sm:py-2 text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:shadow-lg hover:shadow-orange-300/40 rounded-xl transition-all disabled:opacity-60 text-center">
												{saving ? '...' : t('saveButton')}
											</button>
										</div>
									)}
								</div>
							</div>
						</div>
					</div>
				</main>
			)}

			<DeleteModal
				isOpen={showDeleteModal}
				itemName={cargo?.name || t('noName')}
				itemId={cargo?.id}
				onCancel={() => setShowDeleteModal(false)}
				onConfirm={() => { setShowDeleteModal(false); handleDelete() }}
			/>
		</div>
	)
}
