'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Save, FileDown, Bell, RotateCcw, ChevronLeft, ChevronRight, Calculator, ArrowLeft, Trash2 } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { repos } from '@/lib/data/repos'
import type { CalcResult } from '@/lib/calculator/engine'
import { CalculatorForm, type CalcCargoSnapshot } from '@/components/calculator/CalculatorForm'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { PageLoader } from '@/components/PageLoader'
import { ToastItem, type Toast } from '@/components/Toast'
import { DeleteModal } from '@/components/admin/DeleteModal'
import { Stepper } from '@/components/waybill/Stepper'
import { WaybillForm } from '@/components/waybill/WaybillForm'
import { LogistSummary } from '@/components/waybill/LogistSummary'
import { openWaybillPrint } from '@/lib/waybill/print'
import { effectiveVolume, initialWaybill, totalWeight, validateWaybill, type Waybill } from '@/lib/waybill/model'

// Страница накладной (ТЗ v2.0 + правки) в виде пошагового мастера (визард).
// 3 шага; на каждом — часть формы. Шаги «Груз» и «Оплата и расчёт» объединены (правка 1).
// Данные калькулятора копируются в накладную/сводку логистам (правка 2).
//
// ПРАВКИ 2:
//   п.6 — накладная сохраняется в БД (repo.waybills) и открывается на редактирование
//         по id; вместе с ней создаётся/обновляется груз в трекере;
//   п.7 — номер выдаёт сервер при открытии формы (клиентский счётчик давал дубли).

const STEPS = ['Отправитель и получатель', 'Груз, оплата и расчёт', 'Итог и отправка']

export function CreateWaybillPage({ waybillId }: { waybillId?: string } = {}) {
	const { t } = useLang()
	const repo = repos
	const isEdit = !!waybillId
	const [mounted, setMounted] = useState(false)
	const [minLoadDone, setMinLoadDone] = useState(false)
	const [loaded, setLoaded] = useState(!isEdit) // накладная для редактирования загружена
	const [notFound, setNotFound] = useState(false)
	const [waybill, setWaybill] = useState<Waybill>(initialWaybill)
	const [toasts, setToasts] = useState<Toast[]>([])
	const [saving, setSaving] = useState(false)
	const [confirmDelete, setConfirmDelete] = useState(false)
	const [calcKey, setCalcKey] = useState(0)
	const [prefill, setPrefill] = useState<{ volume?: number; weight?: number; mode?: 'totals' }>({})
	const [step, setStep] = useState(0)
	const [maxStep, setMaxStep] = useState(0)
	const [showErrors, setShowErrors] = useState(false) // подсветка обязательных полей после «Сохранить»
	const numberInit = useRef(false) // номер запрашиваем ровно один раз (StrictMode-safe)

	const addToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
		const id = `${Date.now()}-${Math.random()}`
		setToasts((prev) => [...prev, { id, message, type }])
		setTimeout(() => setToasts((prev) => prev.filter((tt) => tt.id !== id)), 4000)
	}, [])

	useEffect(() => {
		setMounted(true)
		const timer = setTimeout(() => setMinLoadDone(true), 444)
		return () => clearTimeout(timer)
	}, [])

	// Новая накладная: дата приёма = сегодня, номер резервирует сервер (ПРАВКИ 2 п.7).
	// Редактирование: тянем накладную по id.
	useEffect(() => {
		if (!mounted || numberInit.current) return
		numberInit.current = true
		let alive = true

		if (isEdit) {
			repo.waybills
				.get(waybillId!)
				.then((found) => {
					if (!alive) return
					if (!found) {
						setNotFound(true)
						return
					}
					setWaybill(found)
					setLoaded(true)
				})
				.catch(() => alive && setNotFound(true))
			return () => {
				alive = false
			}
		}

		const today = new Date().toISOString().slice(0, 10)
		setWaybill((w) => ({ ...w, acceptanceDate: w.acceptanceDate || today }))
		repo.waybills
			.reserveNumber()
			.then((number) => alive && setWaybill((w) => ({ ...w, number: w.number ?? number })))
			.catch(() => alive && addToast('Не удалось получить номер накладной', 'error'))

		return () => {
			alive = false
		}
	}, [mounted, isEdit, waybillId, repo, addToast])

	// Навигация по шагам
	// Шаги визарда заведены в историю браузера: каждый переход вперёд добавляет запись,
	// поэтому кнопка «Назад» в браузере возвращает на предыдущий ШАГ, а не выбрасывает
	// со страницы в список. Адрес при этом не меняется — номер шага лежит в history.state
	// (иначе перезагрузка открывала бы пустую форму на середине визарда).
	const goTo = (i: number) => {
		const target = Math.min(Math.max(i, 0), STEPS.length - 1)
		if (target === step) return
		if (target > step) {
			// по одной записи на шаг, чтобы «Назад» шёл ровно по шагам
			for (let k = step; k < target; k++) window.history.pushState({ wizardStep: k + 1 }, '')
			setStep(target)
			setMaxStep((m) => Math.max(m, target))
		} else {
			// назад — средствами истории: шаг выставит обработчик popstate
			window.history.go(target - step)
		}
	}
	const next = () => goTo(step + 1)
	const back = () => goTo(step - 1)

	// Возврат/вперёд в браузере → соответствующий шаг визарда
	useEffect(() => {
		const onPop = (e: PopStateEvent) => {
			const s = (e.state as { wizardStep?: number } | null)?.wizardStep ?? 0
			setStep(Math.min(Math.max(s, 0), STEPS.length - 1))
		}
		window.addEventListener('popstate', onPop)
		return () => window.removeEventListener('popstate', onPop)
	}, [])

	// Мост: итог калькулятора → «Сумма к оплате»
	const onCalcResult = (r: CalcResult) => {
		if (r.ok && typeof r.price === 'number' && r.price > 0) {
			setWaybill((w) => (w.amount === r.price ? w : { ...w, amount: r.price! }))
		}
	}
	// Обратный мост: параметры груза из накладной → калькулятор
	const fillCalcFromWaybill = () => {
		setPrefill({ mode: 'totals', volume: effectiveVolume(waybill), weight: totalWeight(waybill.positions) })
		setCalcKey((k) => k + 1)
		addToast('Вес и объём переданы в калькулятор')
	}
	// Копирование данных калькулятора → накладная (правка 2): позиции с названием техники
	// и себестоимостью + стоимость доставки. Сводка логистам строится из накладной, поэтому
	// объём/вес/название/себестоимость/доставка появляются в ней автоматически.
	const copyCalcToWaybill = (snap: CalcCargoSnapshot) => {
		setWaybill((w) => ({
			...w,
			positions:
				snap.positions.length > 0
					? snap.positions.map((p, i) => ({
							id: `pos-calc-${Date.now()}-${i}`,
							name: p.name,
							quantity: p.quantity,
							length: p.length,
							width: p.width,
							height: p.height,
							weight: p.weight,
							price: p.price,
						}))
					: w.positions,
			manualVolume: false, // объём считается из габаритов позиций
			amount: snap.price > 0 ? snap.price : w.amount,
		}))
		addToast('Данные калькулятора скопированы в накладную')
	}

	const save = async () => {
		// Нормальная валидация: обязательные поля + формат телефона (правка)
		const errors = validateWaybill(waybill)
		if (errors.length) {
			setShowErrors(true)
			goTo(errors[0].step)
			addToast(errors[0].message, 'error')
			return
		}
		// Черновик при сохранении становится активной накладной.
		const payload: Waybill = { ...waybill, status: waybill.status === 'draft' ? 'active' : waybill.status }

		setSaving(true)
		try {
			const isNew = !payload.docId
			const saved = payload.docId
				? await repo.waybills.update(payload.docId, payload)
				: await repo.waybills.create(payload)
			setWaybill(saved)
			addToast(`Накладная №${saved.number} сохранена`)
			// Созданную накладную «прописываем» в адресной строке, чтобы обновление
			// страницы вело на неё, а не на пустую форму создания. Номер шага в
			// history.state сохраняем — иначе «Назад» после сохранения сбросит визард.
			if (isNew) window.history.replaceState({ wizardStep: step }, '', `/admin/waybills/${saved.docId}`)
		} catch (e) {
			addToast(e instanceof Error && e.message ? e.message : 'Не удалось сохранить накладную', 'error')
		} finally {
			setSaving(false)
		}
	}

	const reset = async () => {
		setWaybill({ ...initialWaybill(), acceptanceDate: new Date().toISOString().slice(0, 10) })
		setStep(0)
		setMaxStep(0)
		setShowErrors(false)
		// Новая накладная — новый номер с сервера (ПРАВКИ 2 п.7)
		try {
			const number = await repo.waybills.reserveNumber()
			setWaybill((w) => ({ ...w, number }))
		} catch {
			addToast('Не удалось получить номер накладной', 'error')
		}
		addToast('Форма очищена')
	}

	const remove = async () => {
		if (!waybill.docId) return
		try {
			await repo.waybills.remove(waybill.docId)
			sessionStorage.setItem('pendingToast', JSON.stringify({ message: `Накладная №${waybill.number} удалена`, type: 'success' }))
			window.location.href = `/admin/waybills`
		} catch {
			addToast('Не удалось удалить накладную', 'error')
		}
	}

	if (!mounted) return <div suppressHydrationWarning />
	if (!minLoadDone || (!loaded && !notFound)) return <PageLoader />

	return (
		<div
			className="min-h-screen bg-slate-50 dark:bg-zinc-950"
			suppressHydrationWarning>
			<AdminSidebar />

			{/* Toasts */}
			<div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
				{toasts.map((tt) => (
					<ToastItem
						key={tt.id}
						toast={tt}
					/>
				))}
			</div>

			<DeleteModal
				isOpen={confirmDelete}
				itemName={waybill.number ? `Накладная №${waybill.number}` : 'Накладная'}
				itemId={waybill.receiver.fullName || null}
				onConfirm={remove}
				onCancel={() => setConfirmDelete(false)}
			/>

			<div className="lg:ml-64 min-h-screen flex flex-col">
				<main className="flex-1 p-4 sm:p-6 pb-12">
					<div className="max-w-4xl mx-auto">
						{notFound ? (
							<div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-700 p-8 text-center">
								<p className="text-slate-600 dark:text-zinc-300">Накладная не найдена.</p>
								<Link
									href={`/admin/waybills`}
									className="inline-flex items-center gap-1.5 mt-4 text-sm font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700">
									<ArrowLeft className="w-4 h-4" /> К списку накладных
								</Link>
							</div>
						) : (
							<>
								{/* Header */}
								<div className="mb-5 flex flex-col sm:flex-row sm:flex-wrap sm:items-start gap-3">
									<div className="w-full sm:w-auto sm:flex-1 min-w-0">
										<Link
											href={`/admin/waybills`}
											className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400 hover:text-orange-600 dark:hover:text-orange-400 mb-1.5">
											<ArrowLeft className="w-3.5 h-3.5" /> Накладные
										</Link>
										<div className="flex items-center gap-2.5 flex-wrap">
											<h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">
												{isEdit ? 'Накладная' : 'Создать накладную'}
											</h2>
											{waybill.number && (
												<span className="text-sm font-semibold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20 rounded-md px-2 py-0.5">
													№{waybill.number}
												</span>
											)}
										</div>
										<p className="text-slate-500 dark:text-zinc-400 text-xs mt-0.5">Шаг {step + 1} из {STEPS.length} · {STEPS[step]}</p>
									</div>
								</div>

								{/* Индикатор шагов */}
								<div className="mb-4">
									<Stepper
										steps={STEPS}
										current={step}
										maxReached={isEdit ? STEPS.length - 1 : maxStep}
										onStep={goTo}
									/>
								</div>

								{/* Контент текущего шага */}
								<div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-700 shadow-sm p-5 sm:p-6">
									{step === 0 && (
										<WaybillForm
											value={waybill}
											onChange={setWaybill}
											only={['sender', 'receiver']}
											showErrors={showErrors}
										/>
									)}

									{step === 1 && (
										<div className="flex flex-col gap-6">
											<WaybillForm
												value={waybill}
												onChange={setWaybill}
												only={['cargo', 'payment']}
												showErrors={showErrors}
											/>
											<div className="pt-6 border-t border-slate-100 dark:border-zinc-800">
												<div className="flex items-center justify-between gap-3 mb-4">
													<div className="flex items-center gap-3 min-w-0">
														<span className="w-9 h-9 rounded-lg bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
															<Calculator className="w-[18px] h-[18px]" />
														</span>
														<div className="min-w-0">
															<h3 className="text-[15px] font-semibold text-slate-900 dark:text-zinc-100 leading-tight">Калькулятор стоимости</h3>
															<p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">
																Итог → «Сумма к оплате». Кнопка «{t('calcCopyToWaybill')}» переносит габариты, название и себестоимость в накладную.
															</p>
														</div>
													</div>
													<button
														type="button"
														onClick={fillCalcFromWaybill}
														className="text-xs font-medium text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 whitespace-nowrap shrink-0">
														Заполнить из накладной →
													</button>
												</div>
												<CalculatorForm
													key={calcKey}
													showDisclaimer={false}
													prefill={prefill}
													onResult={onCalcResult}
													captureCargo
													onCopyCargo={copyCalcToWaybill}
												/>
											</div>
										</div>
									)}

									{step === 2 && (
										<div className="flex flex-col gap-6">
											<WaybillForm
												value={waybill}
												onChange={setWaybill}
												only={['header', 'extras']}
												showErrors={showErrors}
											/>
											<div className="pt-6 border-t border-slate-100 dark:border-zinc-800">
												<h3 className="text-[15px] font-semibold text-slate-900 dark:text-zinc-100 mb-1">Данные для логистов</h3>
												<p className="text-xs text-slate-400 dark:text-zinc-500 mb-4">Автосводка по накладной — скопировать или отправить</p>
												<LogistSummary waybill={waybill} />
											</div>
											<div className="flex flex-wrap gap-2 pt-4 border-t border-slate-100 dark:border-zinc-800">
													<button
														type="button"
														onClick={save}
														disabled={saving}
														className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors">
														<Save className="w-4 h-4" /> {saving ? 'Сохранение…' : 'Сохранить накладную'}
													</button>
													<button
														type="button"
														onClick={() => openWaybillPrint(waybill)}
														className="inline-flex items-center gap-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 hover:border-orange-300 text-slate-700 dark:text-zinc-200 font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors">
														<FileDown className="w-4 h-4" /> Скачать PDF
													</button>
													{/* Отключено до согласования канала уведомлений (см. NotifyModal). */}
													<button
														type="button"
														disabled
														title="Канал уведомлений пока не подключён"
														className="inline-flex items-center gap-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
														<Bell className="w-4 h-4" /> Уведомить клиента
													</button>
													{waybill.docId ? (
														<button
															type="button"
															onClick={() => setConfirmDelete(true)}
															className="inline-flex items-center gap-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 font-medium px-3 py-2.5 rounded-lg text-sm transition-colors ml-auto">
															<Trash2 className="w-4 h-4" /> Удалить
														</button>
													) : (
														<button
															type="button"
															onClick={reset}
															className="inline-flex items-center gap-2 text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200 font-medium px-3 py-2.5 rounded-lg text-sm transition-colors ml-auto">
															<RotateCcw className="w-4 h-4" /> Очистить
														</button>
													)}
											</div>
										</div>
									)}
								</div>

								{/* Навигация по шагам */}
								<div className="mt-4 flex items-center justify-between gap-3">
									<button
										type="button"
										onClick={back}
										disabled={step === 0}
										className="inline-flex items-center gap-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-600 text-slate-700 dark:text-zinc-200 font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
										<ChevronLeft className="w-4 h-4" /> Назад
									</button>
									{step < STEPS.length - 1 && (
										<button
											type="button"
											onClick={next}
											className="inline-flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors">
											Далее <ChevronRight className="w-4 h-4" />
										</button>
									)}
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
