'use client'

import { useState, useEffect, useCallback, useLayoutEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Pencil, Copy, Check, Trash2, Package, MapPin, ArrowRight, Folder } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { repos } from '@/lib/data/repos'
import { RepoError } from '@/lib/data/types'
import { TOAST_VIEWPORT, ToastItem, newToastId } from '@/components/Toast'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { DeleteModal } from '@/components/admin/DeleteModal'
import { CargoWaybillBlock } from '@/components/admin/CargoWaybillBlock'
import { ConfirmModal } from '@/components/admin/ConfirmModal'
import { PageLoader } from '@/components/PageLoader'
import { CitySelect, StatusSelect, PaymentSelect, CurrencySelect } from '@/components/admin/Selects'
import { DatePickerField } from '@/components/admin/DatePickerField'
import { TimeframeInput } from '@/components/admin/TimeframeInput'
import { Spinner } from '@/components/Spinner'
import { getStatusUi, getPaymentUi } from '@/components/admin/statusUi'
import {
	cargoToDraft,
	draftToPayload,
	buildCargoPatch,
	sanitizeCargoNumberInput,
	type DraftState,
} from '@/components/admin/cargoDraft'
import { formatDate, formatMoney, formatPaymentDetail, getCurrencySymbol, displayTimeframe, safeLocalPath, isAbortError } from '@/lib/format'
import type { Toast } from '@/components/Toast'
import type { Cargo } from '@/components/admin/types'

const INPUT_CLS =
	'w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-slate-900 dark:text-zinc-100 text-sm font-medium placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all'

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
	<p className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-3">{children}</p>
)

// На мобиле в view-mode поле — row (label слева, value справа). В edit-mode и на десктопе — stack.
const Field = ({ editMode, children }: { editMode: boolean; children: React.ReactNode }) => (
	<div className={editMode ? 'space-y-1.5' : 'flex items-center justify-between gap-3 lg:block lg:space-y-1.5'}>
		{children}
	</div>
)

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
	<p className="text-xs font-medium text-slate-700 dark:text-zinc-200">{children}</p>
)

const FieldValue = ({ children, empty }: { children: React.ReactNode; empty?: boolean }) => (
	<p className={`text-sm font-medium text-right lg:text-left ${empty ? 'text-slate-400 dark:text-zinc-500 italic' : 'text-slate-900 dark:text-zinc-100'}`}>{children}</p>
)

export function CargoDetailPage({ id }: { id: string }) {
	const { t } = useLang()
	const router = useRouter()
	const repo = repos
	const searchParams = useSearchParams()
	const backToList = () => {
		const params = new URLSearchParams(searchParams.toString())
		const returnTo = params.get('returnTo')
		params.delete('returnTo')
		// returnTo приходит из адреса — подделываемый вход: только внутренний путь, иначе открытый редирект.
		if (returnTo) { router.push(safeLocalPath(returnTo)); return }
		const qs = params.toString()
		router.push(qs ? `/admin?${qs}` : `/admin`)
	}
	// Свежие t и backToList для эффектов: их смена (язык, URL) не должна перезапрашивать груз.
	const tRef = useRef(t)
	const backToListRef = useRef(backToList)
	useLayoutEffect(() => {
		tRef.current = t
		backToListRef.current = backToList
	})
	// Слепок черновика на момент входа в правку: от него считается, что оператор реально изменил.
	const baseDraftRef = useRef<DraftState | null>(null)
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
		const tid = newToastId()
		setToasts((prev) => [...prev, { id: tid, message, type }])
		setTimeout(() => {
			setToasts((prev) => prev.map((t) => (t.id === tid ? { ...t, exiting: true } : t)))
			setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== tid)), 350)
		}, 5000)
	}, [])

	useEffect(() => {
		setMounted(true)
		const ctrl = new AbortController()
		void (async () => {
			try {
				const data = await repo.cargos.get(id, ctrl.signal)
				if (ctrl.signal.aborted) return
				if (data === null) { backToListRef.current(); return }
				setCargo(data)
			} catch (e) {
				if (isAbortError(e) || ctrl.signal.aborted) return
				addToast(tRef.current('loadError'), 'error')
			} finally {
				if (!ctrl.signal.aborted) setLoading(false)
			}
		})()
		const timer = setTimeout(() => setMinLoadDone(true), 444)
		return () => { ctrl.abort(); clearTimeout(timer) }
	}, [id, repo, addToast])

	// Тихое обновление после сохранения: ответ PATCH мог не содержать папку, а параллельные
	// правки (папка, накладная) должны быть видны сразу.
	const refreshCargo = async () => {
		try {
			const fresh = await repo.cargos.get(id)
			if (fresh) setCargo(fresh)
		} catch {}
	}

	const startEdit = () => {
		if (!cargo) return
		const base = cargoToDraft(cargo)
		baseDraftRef.current = base
		setDraft({ ...base })
		setEditMode(true)
	}
	const cancelEdit = () => { baseDraftRef.current = null; setDraft(null); setEditMode(false) }
	const setField = <K extends keyof DraftState>(key: K, value: DraftState[K]) =>
		setDraft((d) => d && { ...d, [key]: value })

	const performSave = async () => {
		if (!cargo || !draft) return
		setSaving(true)
		try {
			// Шлём только то, что оператор изменил: весь черновик затирал бы параллельные правки
			// (массовое обновление папки, синхронизация накладной delivered → «прибыл»).
			const base = baseDraftRef.current
			const patch = base ? buildCargoPatch(base, draft) : draftToPayload(draft)
			if (Object.keys(patch).length > 0) {
				setCargo(await repo.cargos.update(cargo.docId, patch))
			}
			baseDraftRef.current = null
			setEditMode(false)
			setDraft(null)
			addToast(t('detailsUpdated'), 'success')
			void refreshCargo()
		} catch (e) {
			// 409 — номер груза уже у другого груза
			if (e instanceof RepoError && e.status === 409) addToast(t('cargoNumberTaken'), 'error')
			else addToast(t('detailsUpdateError'), 'error')
		} finally {
			setSaving(false)
		}
	}

	const handleSave = () => {
		if (!cargo || !draft) return
		if (!draft.fromCity.trim() || !draft.currentCity.trim() || !draft.toCity.trim()) { addToast(t('cityEmpty'), 'error'); return }
		// Подтверждение при первой смене статуса на "прибыл" (без него легко промахнуться в селекте).
		const base = baseDraftRef.current
		if (draft.status === 'прибыл' && (base ? base.status !== 'прибыл' : cargo.status !== 'прибыл')) {
			setShowArrivedConfirm(true)
			return
		}
		void performSave()
	}

	const handleDelete = async () => {
		if (!cargo) return
		try {
			await repo.cargos.remove(cargo.docId)
		} catch {
			addToast(t('deleteError'), 'error'); return
		}
		sessionStorage.setItem('pendingToast', JSON.stringify({ message: t('cargoDeleted'), type: 'success' }))
		backToList()
	}

	const handleCopy = async () => {
		if (!cargo) return
		try {
			// clipboard недоступен без HTTPS/разрешения — писать «Скопировано» до результата нельзя
			await navigator.clipboard.writeText(cargo.id)
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
		} catch {
			addToast(t('copyError'), 'error')
		}
	}

	if (!mounted) return <div suppressHydrationWarning />

	const draftSym = getCurrencySymbol(draft?.currency ?? 'KZT')
	const statusUi = getStatusUi(cargo?.status ?? '', t)
	const paymentUi = getPaymentUi(cargo?.paymentStatus, t)
	const deliveryMoney = formatMoney(cargo?.deliveryAmount, cargo?.currency)
	// Валюта дописывается, только если в деталях одно число (иначе «Оплачено 50 000 ₸ ₸»)
	const partialDetail = formatPaymentDetail(cargo?.partialPaymentDetail, cargo?.currency)
	const d = draft!

	return (
		<div className="min-h-screen bg-slate-50 dark:bg-zinc-950" suppressHydrationWarning>
			<AdminSidebar />

			<div className="lg:ml-64 min-h-screen flex flex-col">
				<div className={TOAST_VIEWPORT}>
					{toasts.map((toast) => (
						<ToastItem key={toast.id} toast={toast} />
					))}
				</div>

				{(loading || !minLoadDone) && <PageLoader />}

				{!loading && minLoadDone && cargo && (
				<main className="flex-1 overflow-y-auto">
					<div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
						{/* Назад + заголовок: оба слева, заголовок под ссылкой (единый шаблон страниц деталей) */}
						<div className="mb-5">
							<button
								onClick={backToList}
								className="inline-flex items-center gap-1.5 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white font-medium text-sm transition-colors">
								<ArrowLeft className="w-4 h-4" />
								{t('backToList')}
							</button>
							<h1 className="mt-1.5 text-xl font-semibold text-slate-900 dark:text-zinc-100">{t('cargoDetailTitle')}</h1>
						</div>

						{/* Main card */}
						<div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-slate-200 dark:border-zinc-700">
							<div className="p-5 sm:p-6 flex flex-col gap-6">

								{/* Cargo name + track ID + edit btn */}
								<div className="flex items-start justify-between gap-4">
									<div className="flex-1 min-w-0">
										{editMode ? (
											<div className="flex gap-2">
												<div className="w-24 shrink-0">
													<FieldLabel>{t('cargoNumberLabel')}</FieldLabel>
													<input
														type="text"
														inputMode="numeric"
														value={d.cargoNumber}
														onChange={(e) => setField('cargoNumber', sanitizeCargoNumberInput(e.target.value, d.cargoNumber))}
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
												<h2 className="text-xl font-semibold text-slate-900 dark:text-zinc-100 leading-snug break-words">
													{cargo.cargoNumber != null && (
														<span className="text-orange-600 dark:text-orange-400 mr-2">№{cargo.cargoNumber}</span>
													)}
													{cargo.name || <span className="text-slate-400 dark:text-zinc-500 italic font-medium text-base">{t('noName')}</span>}
												</h2>
												{/* Статус и папка — рядом с названием (раньше статус жил в дублирующей секции «Маршрут») */}
												<div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 min-w-0">
													<span
														className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border shrink-0 ${statusUi.cls}`}
														title={t('statusCardLabel')}>
														<span className={`w-1.5 h-1.5 rounded-full ${statusUi.dot}`} />
														{statusUi.label}
													</span>
													{/* Папка груза — только для чтения: назначается в разделе «Папки» */}
													{cargo.folderId && (
														<span
															className="inline-flex items-center gap-1 min-w-0 max-w-full text-xs font-medium text-slate-600 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-md px-2 py-1"
															title={t('folderLabel')}>
															<Folder className="w-3.5 h-3.5 shrink-0" />
															<span className="truncate">{cargo.folderName ?? t('folderInBadge')}</span>
														</span>
													)}
													<button
														onClick={handleCopy}
														className={`inline-flex items-center gap-1.5 text-xs font-mono transition-colors max-w-full min-w-0 ${copied ? 'text-emerald-600 dark:text-emerald-300' : 'text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-200'}`}>
														<span className="truncate">{copied ? t('copied') : cargo.id}</span>
														{copied ? <Check className="w-3.5 h-3.5 shrink-0" /> : <Copy className="w-3.5 h-3.5 shrink-0" />}
													</button>
												</div>
											</div>
										)}
									</div>
									{!editMode && (
										<button
											onClick={startEdit}
											className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-zinc-200 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 rounded-lg transition-colors shrink-0"
											title={t('editButton')}>
											<Pencil className="w-3.5 h-3.5" />
											<span className="hidden sm:inline">{t('editButton')}</span>
										</button>
									)}
								</div>

								{/* Маршрут. В просмотре — только визуальная полоса откуда → сейчас → куда
								    (раньше под ней шла секция с теми же тремя полями — дубль). В правке полоса
								    уступает место редактируемым полям, статус правится там же. */}
								{editMode ? (
									<div>
										<SectionTitle>{t('secRoute')}</SectionTitle>
										<div className="grid grid-cols-1 gap-2 lg:grid-cols-3 lg:gap-3">
											<Field editMode>
												<FieldLabel>{t('fromCardLabel')}</FieldLabel>
												<CitySelect value={d.fromCity} onChange={(v) => setField('fromCity', v)} />
											</Field>
											<Field editMode>
												<FieldLabel>{t('toCardLabel')}</FieldLabel>
												<CitySelect value={d.toCity} onChange={(v) => setField('toCity', v)} />
											</Field>
											<Field editMode>
												<FieldLabel>{t('currentLocationLabel')}</FieldLabel>
												<CitySelect value={d.currentCity} onChange={(v) => setField('currentCity', v)} />
											</Field>
											<Field editMode>
												<FieldLabel>{t('statusCardLabel')}</FieldLabel>
												<StatusSelect value={d.status} onChange={(v) => setField('status', v)} />
											</Field>
											{/* Папка груза — только для чтения: назначается в разделе «Папки» */}
											{cargo.folderId && (
												<Field editMode>
													<FieldLabel>{t('folderLabel')}</FieldLabel>
													<p className="px-3 py-2 text-sm font-medium text-slate-600 dark:text-zinc-300 bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-700 rounded-lg truncate">{cargo.folderName ?? '—'}</p>
												</Field>
											)}
										</div>
									</div>
								) : (
									<div className="bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-700 rounded-lg p-4">
										<div className="flex items-center gap-2">
											<div className="flex-1 min-w-0 text-center">
												<Package className="w-4 h-4 text-slate-400 dark:text-zinc-500 mx-auto mb-1.5" />
												<p className="text-[10px] font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wide mb-0.5">{t('fromCardLabel')}</p>
												<p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-zinc-100 truncate" title={cargo.fromCity}>{cargo.fromCity}</p>
											</div>
											<ArrowRight className="w-3.5 h-3.5 text-slate-300 dark:text-zinc-600 shrink-0" />
											<div className="flex-1 min-w-0 text-center">
												<MapPin className="w-4 h-4 text-orange-500 mx-auto mb-1.5" />
												<p className="text-[10px] font-medium text-orange-600 dark:text-orange-400 uppercase tracking-wide mb-0.5">{t('currentLabel')}</p>
												<p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-zinc-100 truncate" title={cargo.currentCity}>{cargo.currentCity}</p>
											</div>
											<ArrowRight className="w-3.5 h-3.5 text-slate-300 dark:text-zinc-600 shrink-0" />
											<div className="flex-1 min-w-0 text-center">
												<Check className="w-4 h-4 text-slate-400 dark:text-zinc-500 mx-auto mb-1.5" />
												<p className="text-[10px] font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wide mb-0.5">{t('toCardLabel')}</p>
												<p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-zinc-100 truncate" title={cargo.toCity}>{cargo.toCity}</p>
											</div>
										</div>
									</div>
								)}

								{/* Даты */}
								<div>
									<SectionTitle>{t('secDates')}</SectionTitle>
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
									<SectionTitle>{t('secPayment')}</SectionTitle>
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
												<FieldValue empty={!deliveryMoney}>
													{deliveryMoney || t('notSpecified')}
												</FieldValue>
											)}
										</Field>
										<Field editMode={editMode}>
											<FieldLabel>{t('paymentStatusLabel')}</FieldLabel>
											{editMode ? (
												<PaymentSelect value={d.paymentStatus} onChange={(v) => setDraft((prev) => prev ? { ...prev, paymentStatus: v, partialPaymentDetail: v !== 'partial' ? '' : prev.partialPaymentDetail } : prev)} />
											) : (
												<span className={`inline-flex text-xs font-semibold px-2.5 py-1 rounded-md border ${paymentUi.cls}`}>
													{paymentUi.label}
												</span>
											)}
										</Field>
										{(editMode ? d.paymentStatus === 'partial' : cargo.paymentStatus === 'partial') && (
											<Field editMode={editMode}>
												<FieldLabel>{t('partialPaymentDetailLabel')}</FieldLabel>
												{editMode ? (
													<div className="flex items-center gap-2">
														{/* text, а не number: в поле может лежать свободный текст («Оплачено 50 000»),
														    и number показал бы его пустым — оператор решил бы, что деталей нет */}
														<input type="text" inputMode="decimal" value={d.partialPaymentDetail} onChange={(e) => setField('partialPaymentDetail', e.target.value)} placeholder={t('enterAmount')} className={`${INPUT_CLS} flex-1 min-w-0`} />
														<span className="text-slate-500 dark:text-zinc-400 font-medium text-sm shrink-0">{draftSym}</span>
													</div>
												) : (
													<FieldValue empty={!partialDetail}>
														{partialDetail || t('notSpecified')}
													</FieldValue>
												)}
											</Field>
										)}
									</div>
								</div>

								{/* Накладная (ПРАВКИ 2: накладная видна прямо в грузе — и в просмотре,
								    и при редактировании). Отделена от полей груза разделителем. */}
								<div className="border-t border-slate-200 dark:border-zinc-700 pt-5">
									<SectionTitle>{t('wpWaybill')}</SectionTitle>
									<CargoWaybillBlock cargoDocId={cargo.docId} />
								</div>

								{/* Edit actions */}
								{editMode && (
									<div className="border-t border-slate-200 dark:border-zinc-700 pt-4 flex items-center justify-end gap-2">
										<button onClick={cancelEdit} className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-zinc-200 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800/60 rounded-lg transition-colors">
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
						<div className="mt-5 bg-white dark:bg-zinc-900 rounded-xl border border-red-200 dark:border-red-500/25">
							<div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3">
								<div className="flex-1 min-w-0">
									<p className="text-sm font-semibold text-red-700 dark:text-red-300">{t('dangerZoneTitle')}</p>
									<p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{t('dangerZoneDescription')}</p>
								</div>
								<button
									onClick={() => setShowDeleteModal(true)}
									className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-red-700 dark:text-red-300 bg-white dark:bg-zinc-900 hover:bg-red-50 dark:hover:bg-red-500/15 border border-red-200 dark:border-red-500/25 rounded-lg transition-colors shrink-0">
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
