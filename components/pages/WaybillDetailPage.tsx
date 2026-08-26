'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Bell, FileDown, Pencil, Trash2, Truck } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { repos } from '@/lib/data/repos'
import type { WaybillDTO } from '@/lib/data/types'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { DeleteModal } from '@/components/admin/DeleteModal'
import { PageLoader } from '@/components/PageLoader'
import { ToastItem, type Toast } from '@/components/Toast'
import { CreateWaybillPage } from '@/components/pages/CreateWaybillPage'
import { LogistSummary } from '@/components/waybill/LogistSummary'
import { NotifyModal } from '@/components/waybill/NotifyModal'
import { openWaybillPrint } from '@/lib/waybill/print'
import { STATUS_KEYS } from '@/lib/waybill/statusI18n'
import { effectiveVolume, fmtDecimal, fmtMoney, totalWeight, trimNum } from '@/lib/waybill/totals'
import type { WaybillStatus } from '@/lib/waybill/model'
import { displayTimeframe } from '@/lib/format'

// Детальный просмотр накладной — по образцу карточки груза ([CargoDetailPage.tsx]):
// сначала read-only карточка, редактирование открывается кнопкой с карандашом.
//
// Редактор — тот же мастер [CreateWaybillPage.tsx], он приходит целой страницей
// (со своим сайдбаром), поэтому здесь мы просто отдаём его вместо карточки.
// Признак режима живёт в адресе (`?edit=1`), а не в state: тогда «Назад» в браузере
// возвращает из редактирования в просмотр, а не выбрасывает в список.

const BADGE: Record<WaybillStatus, string> = {
	draft: 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-700',
	active: 'bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/25',
	delivered: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/25',
	cancelled: 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/25',
}

/** 'YYYY-MM-DD' → 'ДД.ММ.ГГГГ'. */
const ru = (date: string) => {
	if (!date) return ''
	const [y, m, d] = date.split('-')
	return y && m && d ? `${d}.${m}.${y}` : date
}

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
	<p className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-3">{children}</p>
)

// На мобиле поле — строка (подпись слева, значение справа), на десктопе — стопка.
// Один в один с карточкой груза, чтобы разделы выглядели одинаково.
const Field = ({ label, value, empty }: { label: string; value: React.ReactNode; empty?: boolean }) => (
	<div className="flex items-center justify-between gap-3 lg:block lg:space-y-1.5">
		<p className="text-xs font-medium text-slate-700 dark:text-zinc-200 shrink-0">{label}</p>
		<div
			className={`text-sm font-medium text-right lg:text-left min-w-0 break-words ${
				empty ? 'text-slate-400 dark:text-zinc-500 italic' : 'text-slate-900 dark:text-zinc-100'
			}`}>
			{value}
		</div>
	</div>
)

const Grid = ({ children }: { children: React.ReactNode }) => (
	<div className="grid grid-cols-1 gap-2 lg:grid-cols-3 lg:gap-3">{children}</div>
)

/** Строка «подпись — значение» внутри мобильной карточки позиции. Пустое не рисуем. */
const PosRow = ({ label, value }: { label: string; value: string }) =>
	value ? (
		<div className="flex items-baseline justify-between gap-3 text-xs">
			<dt className="text-slate-500 dark:text-zinc-400 shrink-0">{label}</dt>
			<dd className="m-0 font-medium text-slate-800 dark:text-zinc-200 tabular-nums text-right">{value}</dd>
		</div>
	) : null

export function WaybillDetailPage({ id }: { id: string }) {
	const { t, tf } = useLang()
	const router = useRouter()
	const searchParams = useSearchParams()
	const editMode = searchParams.get('edit') === '1'

	// Одно состояние вместо привычной пары mounted+minLoadDone: PageLoader не содержит
	// переводов, поэтому его можно рисовать и на сервере — расхождения гидратации нет,
	// а состояние выставляется из таймера, а не синхронно в теле эффекта.
	const [ready, setReady] = useState(false)
	const [waybill, setWaybill] = useState<WaybillDTO | null>(null)
	const [notFound, setNotFound] = useState(false)
	const [toasts, setToasts] = useState<Toast[]>([])
	const [confirmDelete, setConfirmDelete] = useState(false)
	const [notifyOpen, setNotifyOpen] = useState(false)

	const addToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
		const tid = `${Date.now()}-${Math.random()}`
		setToasts((prev) => [...prev, { id: tid, message, type }])
		setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== tid)), 4000)
	}, [])

	useEffect(() => {
		// Пауза 444 мс — общая для админки (плавность), см. CLAUDE.md §8.
		const timer = setTimeout(() => {
			setReady(true)
			// Тост, перенесённый с другой страницы — например «Накладная №N сохранена»
			// после выхода из режима редактирования.
			const pending = sessionStorage.getItem('pendingToast')
			if (!pending) return
			sessionStorage.removeItem('pendingToast')
			try {
				const { message, type } = JSON.parse(pending) as { message: string; type?: 'success' | 'error' }
				const tid = `pending-${Date.now()}`
				setToasts([{ id: tid, message, type: type ?? 'success' }])
				setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== tid)), 4000)
			} catch {
				/* битый JSON — игнорируем */
			}
		}, 444)
		return () => clearTimeout(timer)
	}, [])

	// Накладную грузим и в режиме редактирования тоже — мастер тянет её сам, но
	// без этого при возврате из редактора карточка показывала бы прежние данные.
	useEffect(() => {
		if (editMode) return
		let alive = true
		repos.waybills
			.get(id)
			.then((found) => {
				if (!alive) return
				if (!found) setNotFound(true)
				else setWaybill(found)
			})
			.catch(() => alive && setNotFound(true))
		return () => {
			alive = false
		}
	}, [id, editMode])

	// Редактирование — это мастер целой страницей, поэтому отдаём его как есть.
	if (editMode) return <CreateWaybillPage waybillId={id} />

	if (!ready || (!waybill && !notFound)) return <PageLoader />

	const remove = async () => {
		if (!waybill) return
		try {
			await repos.waybills.remove(waybill.docId!)
			sessionStorage.setItem(
				'pendingToast',
				JSON.stringify({ message: tf('wpDeleted', { number: waybill.number ?? '' }), type: 'success' })
			)
			router.push('/admin/waybills')
		} catch {
			addToast(t('wpDeleteError'), 'error')
		}
	}

	const w = waybill
	const places = w ? w.positions.reduce((s, p) => s + (p.quantity || 0), 0) : 0
	const weight = w ? totalWeight(w.positions) : 0
	const volume = w ? effectiveVolume(w) : 0
	const senderName =
		w && w.sender.type === 'company' ? w.sender.companyName || w.sender.fullName : (w?.sender.fullName ?? '')

	return (
		<div
			className="min-h-screen bg-slate-50 dark:bg-zinc-950"
			suppressHydrationWarning>
			<AdminSidebar />

			<div className="fixed top-20 lg:top-4 right-4 z-50 flex flex-col gap-2 max-w-xs">
				{toasts.map((toast) => (
					<ToastItem
						key={toast.id}
						toast={toast}
					/>
				))}
			</div>

			{w && (
				<>
					<DeleteModal
						isOpen={confirmDelete}
						itemName={`${t('wpWaybill')} №${w.number ?? ''}`}
						itemId={w.receiver.fullName || null}
						onConfirm={remove}
						onCancel={() => setConfirmDelete(false)}
					/>
					<NotifyModal
						isOpen={notifyOpen}
						waybill={w}
						onClose={() => setNotifyOpen(false)}
						onToast={addToast}
					/>
				</>
			)}

			<div className="lg:ml-64 min-h-screen flex flex-col">
				<main className="flex-1">
					<div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
						{notFound || !w ? (
							<div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-700 p-8 text-center">
								<p className="text-slate-600 dark:text-zinc-300">{t('wpNotFound')}</p>
								<Link
									href="/admin/waybills"
									className="inline-flex items-center gap-1.5 mt-4 text-sm font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700">
									<ArrowLeft className="w-4 h-4" /> {t('wpToList')}
								</Link>
							</div>
						) : (
							<>
								<div className="flex items-center justify-between gap-3 mb-5">
									<Link
										href="/admin/waybills"
										className="inline-flex items-center gap-1.5 text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white font-medium text-sm transition-colors">
										<ArrowLeft className="w-4 h-4" />
										{t('backToList')}
									</Link>
									<h1 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">{t('wpWaybill')}</h1>
								</div>

								<div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-slate-200 dark:border-zinc-700">
									<div className="p-5 sm:p-6 flex flex-col gap-6">
										{/* Шапка: номер, статус, кнопка редактирования */}
										<div className="flex items-start justify-between gap-4">
											<div className="min-w-0">
												<h2 className="text-xl font-semibold text-slate-900 dark:text-zinc-100 leading-snug">
													<span className="text-orange-600 dark:text-orange-400">№{w.number ?? '—'}</span>
												</h2>
												<div className="mt-2 flex items-center gap-2 flex-wrap">
													<span className={`inline-flex text-xs font-semibold px-2.5 py-1 rounded-md border ${BADGE[w.status]}`}>
														{t(STATUS_KEYS[w.status])}
													</span>
													{w.nature.trim() && (
														<span className="text-xs text-slate-500 dark:text-zinc-400">{w.nature}</span>
													)}
												</div>
											</div>
											<button
												type="button"
												onClick={() => router.push(`/admin/waybills/${id}?edit=1`)}
												title={t('editButton')}
												className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-zinc-200 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 rounded-lg transition-colors shrink-0">
												<Pencil className="w-3.5 h-3.5" />
												<span className="hidden sm:inline">{t('editButton')}</span>
											</button>
										</div>

										{/* Итоги отправления одной полосой */}
										<div className="bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-700 rounded-lg p-4">
											<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
												{[
													{ label: t('wdPlaces'), value: places ? trimNum(places) : '—' },
													{ label: t('wdWeight'), value: weight ? `${fmtDecimal(weight, 1)} кг` : '—' },
													{ label: t('wfVolume'), value: volume ? `${fmtDecimal(volume)} м³` : '—' },
													{ label: t('wfAmount'), value: w.amount ? `${fmtMoney(w.amount)} ₸` : '—' },
												].map((stat) => (
													<div
														key={stat.label}
														className="text-center">
														<p className="text-[10px] font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wide mb-0.5">
															{stat.label}
														</p>
														<p className="text-sm font-semibold text-slate-900 dark:text-zinc-100 truncate">{stat.value}</p>
													</div>
												))}
											</div>
										</div>

										{/* Отправитель */}
										<div>
											<SectionTitle>{t('wfSenderTitle')}</SectionTitle>
											<Grid>
												<Field
													label={w.sender.type === 'company' ? t('wfCompanyName') : t('wfSenderName')}
													value={senderName || t('notSpecified')}
													empty={!senderName}
												/>
												{w.sender.type === 'company' && w.sender.companyTin.trim() && (
													<Field
														label={t('wfCompanyTin')}
														value={w.sender.companyTin}
													/>
												)}
												{w.sender.contactPerson.trim() && (
													<Field
														label={t('wfContactPerson')}
														value={w.sender.contactPerson}
													/>
												)}
												<Field
													label={t('wfSenderAddress')}
													value={w.sender.address || t('notSpecified')}
													empty={!w.sender.address}
												/>
												<Field
													label={t('wfCity')}
													value={w.sender.city || t('notSpecified')}
													empty={!w.sender.city}
												/>
												<Field
													label={t('wfCountry')}
													value={w.sender.country}
												/>
											</Grid>
										</div>

										{/* Получатель */}
										<div>
											<SectionTitle>{t('wfReceiverTitle')}</SectionTitle>
											<Grid>
												<Field
													label={t('wfReceiverFullName')}
													value={w.receiver.fullName || t('notSpecified')}
													empty={!w.receiver.fullName}
												/>
												<Field
													label={t('wfPhone')}
													value={
														w.receiver.phone ? (
															<a
																href={`tel:${w.receiver.phone}`}
																className="text-orange-600 dark:text-orange-400 hover:underline">
																{w.receiver.phone}
															</a>
														) : (
															t('notSpecified')
														)
													}
													empty={!w.receiver.phone}
												/>
												{w.receiver.tin.trim() && (
													<Field
														label={t('wfReceiverTin')}
														value={w.receiver.tin}
													/>
												)}
												{w.receiver.passport.trim() && (
													<Field
														label={t('wfPassport')}
														value={w.receiver.passport}
													/>
												)}
												<Field
													label={t('wfDeliveryAddress')}
													value={w.receiver.address || t('notSpecified')}
													empty={!w.receiver.address}
												/>
												<Field
													label={t('wfCity')}
													value={w.receiver.city || t('notSpecified')}
													empty={!w.receiver.city}
												/>
												<Field
													label={t('wfDeliveryCountry')}
													value={w.receiver.country}
												/>
											</Grid>
										</div>

										{/* Позиции груза */}
										<div className="min-w-0">
											<SectionTitle>{t('wfPositions')}</SectionTitle>
											{w.positions.length === 0 ? (
												<p className="text-sm text-slate-400 dark:text-zinc-500 italic">{t('notSpecified')}</p>
											) : (
												<>
													{/* Телефон: карточки. Таблица в пять колонок на узком экране
													    требует горизонтального скролла, обрезает наименование и
													    читается плохо — поэтому на мобиле её нет вовсе. */}
													<div className="flex flex-col gap-2 lg:hidden">
														{w.positions.map((p) => (
															<div
																key={p.id}
																className="rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/40 p-3">
																<p className="text-sm font-semibold text-slate-900 dark:text-zinc-100 break-words">
																	{p.name || <span className="text-slate-400 dark:text-zinc-500 italic font-medium">{t('notSpecified')}</span>}
																</p>
																<dl className="mt-2 flex flex-col gap-1">
																	<PosRow
																		label={t('wfQty')}
																		value={trimNum(p.quantity)}
																	/>
																	<PosRow
																		label={t('wfDims')}
																		value={
																			p.length || p.width || p.height
																				? `${trimNum(p.length)}×${trimNum(p.width)}×${trimNum(p.height)}`
																				: ''
																		}
																	/>
																	<PosRow
																		label={t('wfPlaceWeight')}
																		value={p.weight ? trimNum(p.weight) : ''}
																	/>
																	<PosRow
																		label={t('wfCost')}
																		value={p.price ? fmtMoney(p.price) : ''}
																	/>
																</dl>
															</div>
														))}
													</div>

													{/* Десктоп: таблица — там колонки помещаются и сравнивать удобнее */}
													<div className="hidden lg:block overflow-x-auto">
													<table className="w-full text-sm border-collapse">
														<thead>
															<tr className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-zinc-400">
																<th className="text-left font-semibold pb-2 pr-3">{t('wdPositionName')}</th>
																<th className="text-right font-semibold pb-2 px-3 whitespace-nowrap">{t('wfQty')}</th>
																<th className="text-right font-semibold pb-2 px-3 whitespace-nowrap">{t('wfDims')}</th>
																<th className="text-right font-semibold pb-2 px-3 whitespace-nowrap">{t('wfPlaceWeight')}</th>
																<th className="text-right font-semibold pb-2 pl-3 whitespace-nowrap">{t('wfCost')}</th>
															</tr>
														</thead>
														<tbody className="tabular-nums">
															{w.positions.map((p) => (
																<tr
																	key={p.id}
																	className="border-t border-slate-100 dark:border-zinc-800">
																	<td className="py-2 pr-3 text-slate-900 dark:text-zinc-100">
																		{p.name || <span className="text-slate-400 dark:text-zinc-500 italic">{t('notSpecified')}</span>}
																	</td>
																	<td className="py-2 px-3 text-right text-slate-700 dark:text-zinc-300">{trimNum(p.quantity)}</td>
																	<td className="py-2 px-3 text-right text-slate-700 dark:text-zinc-300 whitespace-nowrap">
																		{p.length || p.width || p.height
																			? `${trimNum(p.length)}×${trimNum(p.width)}×${trimNum(p.height)}`
																			: '—'}
																	</td>
																	<td className="py-2 px-3 text-right text-slate-700 dark:text-zinc-300">
																		{p.weight ? trimNum(p.weight) : '—'}
																	</td>
																	<td className="py-2 pl-3 text-right text-slate-700 dark:text-zinc-300">
																		{p.price ? fmtMoney(p.price) : '—'}
																	</td>
																</tr>
															))}
														</tbody>
													</table>
													</div>
												</>
											)}
										</div>

										{/* Оплата */}
										<div>
											<SectionTitle>{t('wfPaymentTitle')}</SectionTitle>
											<Grid>
												<Field
													label={t('wfPayer')}
													value={w.payer === 'sender' ? t('wlPayerSender') : t('wlPayerReceiver')}
												/>
												<Field
													label={t('wfPayMethod')}
													value={w.payMethod === 'cashless' ? t('wfCashless') : t('wfCash')}
												/>
												<Field
													label={t('wfAmount')}
													value={w.amount ? `${fmtMoney(w.amount)} ₸` : t('notSpecified')}
													empty={!w.amount}
												/>
											</Grid>
										</div>

										{/* Реквизиты и сроки */}
										<div>
											<SectionTitle>{t('wfExtrasTitle')}</SectionTitle>
											<Grid>
												<Field
													label={t('wfAcceptanceDate')}
													value={ru(w.acceptanceDate) || t('notSpecified')}
													empty={!w.acceptanceDate}
												/>
												<Field
													label={t('wfShipmentDate')}
													value={ru(w.shipmentDate) || t('notSpecified')}
													empty={!w.shipmentDate}
												/>
												<Field
													label={t('deliveryTimeframeLabel')}
													value={w.deliveryTimeframe ? displayTimeframe(w.deliveryTimeframe, t) : t('notSpecified')}
													empty={!w.deliveryTimeframe}
												/>
												<Field
													label={t('wfPackaging')}
													value={w.packagingOk ? t('wfYes') : t('wfNo')}
												/>
												{w.specialInstructions.trim() && (
													<Field
														label={t('wfInstructions')}
														value={w.specialInstructions}
													/>
												)}
											</Grid>
										</div>

										{/* Связанный груз в трекере */}
										{w.cargoId && (
											<div>
												<SectionTitle>{t('wdCargoTitle')}</SectionTitle>
												<Link
													href={`/admin/cargo/${w.cargoId}`}
													className="inline-flex items-center gap-2 text-sm font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700">
													<Truck className="w-4 h-4" />
													{t('wdCargoLink')}
												</Link>
											</div>
										)}

										{/* Сводка логистам */}
										<div className="border-t border-slate-200 dark:border-zinc-700 pt-5">
											<SectionTitle>{t('wpLogistTitle')}</SectionTitle>
											<LogistSummary waybill={w} />
										</div>

										{/* Действия */}
										<div className="border-t border-slate-200 dark:border-zinc-700 pt-4 flex flex-wrap gap-2">
											<button
												type="button"
												onClick={() => openWaybillPrint(w)}
												className="inline-flex grow sm:grow-0 items-center justify-center gap-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 hover:border-orange-300 text-slate-700 dark:text-zinc-200 font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors">
												<FileDown className="w-4 h-4" /> {t('wpDownloadPdf')}
											</button>
											<button
												type="button"
												onClick={() => setNotifyOpen(true)}
												className="inline-flex grow sm:grow-0 items-center justify-center gap-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 hover:border-orange-300 text-slate-700 dark:text-zinc-200 font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors">
												<Bell className="w-4 h-4" /> {t('wpNotifyClient')}
											</button>
											<button
												type="button"
												onClick={() => router.push(`/admin/waybills/${id}?edit=1`)}
												className="inline-flex grow sm:grow-0 items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors">
												<Pencil className="w-4 h-4" /> {t('editButton')}
											</button>
										</div>
									</div>
								</div>

								{/* Опасная зона — как в карточке груза */}
								<div className="mt-5 bg-white dark:bg-zinc-900 rounded-xl border border-red-200 dark:border-red-500/25">
									<div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3">
										<div className="flex-1 min-w-0">
											<p className="text-sm font-semibold text-red-700 dark:text-red-300">{t('dangerZoneTitle')}</p>
											<p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{t('wdDangerHint')}</p>
										</div>
										<button
											type="button"
											onClick={() => setConfirmDelete(true)}
											className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-red-700 dark:text-red-300 bg-white dark:bg-zinc-900 hover:bg-red-50 dark:hover:bg-red-500/15 border border-red-200 dark:border-red-500/25 rounded-lg transition-colors shrink-0">
											<Trash2 className="w-4 h-4" />
											{t('deleteButton')}
										</button>
									</div>
								</div>
							</>
						)}
					</div>
				</main>
				<footer className="text-center text-slate-400 dark:text-zinc-500 text-xs py-4 px-4">{t('adminFooter')}</footer>
			</div>
		</div>
	)
}
