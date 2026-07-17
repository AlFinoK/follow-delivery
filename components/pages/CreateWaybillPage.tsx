'use client'

import { useEffect, useState } from 'react'
import { Save, FileDown, Bell, RotateCcw, FlaskConical, ChevronLeft, ChevronRight, Info, Calculator } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { useRepos } from '@/lib/data/useRepos'
import type { CalcResult } from '@/lib/calculator/engine'
import { CalculatorForm } from '@/components/calculator/CalculatorForm'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { PageLoader } from '@/components/PageLoader'
import { ToastItem, type Toast } from '@/components/Toast'
import { RoleSwitcher } from '@/components/demo/RoleSwitcher'
import { Stepper } from '@/components/demo/Stepper'
import { WaybillForm } from '@/components/demo/WaybillForm'
import { LogistSummary } from '@/components/demo/LogistSummary'
import { NotifyModal } from '@/components/demo/NotifyModal'
import { openWaybillPrint } from '@/components/demo/printWaybill'
import {
	effectiveVolume,
	initialWaybill,
	nextWaybillNumber,
	notificationText,
	totalWeight,
	type Role,
	type Waybill,
} from '@/lib/demo/waybill'

// Страница «Создать груз» (ТЗ v2.0) в виде пошагового мастера (визард).
// 4 шага; на каждом — часть формы. Данные накладной питают калькулятор и сводку
// логистам. При «Сохранить» накладная кладётся в демо-стор (появляется в списке/поиске).
// В проде переедет на /admin/cargo/create с реальным репозиторием и ролью из сессии.

const STEPS = ['Отправитель и получатель', 'Груз', 'Оплата и расчёт', 'Итог и отправка']

export function CreateWaybillPage() {
	const { t } = useLang()
	const repo = useRepos()
	const [mounted, setMounted] = useState(false)
	const [minLoadDone, setMinLoadDone] = useState(false)
	const [role, setRole] = useState<Role>('operator')
	const [waybill, setWaybill] = useState<Waybill>(initialWaybill)
	const [toasts, setToasts] = useState<Toast[]>([])
	const [notify, setNotify] = useState(false)
	const [createdDocId, setCreatedDocId] = useState<string | null>(null)
	const [calcKey, setCalcKey] = useState(0)
	const [prefill, setPrefill] = useState<{ volume?: number; weight?: number; mode?: 'totals' }>({})
	const [step, setStep] = useState(0)
	const [maxStep, setMaxStep] = useState(0)

	useEffect(() => {
		setMounted(true)
		setWaybill((w) => (w.acceptanceDate ? w : { ...w, acceptanceDate: new Date().toISOString().slice(0, 10) }))
		const timer = setTimeout(() => setMinLoadDone(true), 444)
		return () => clearTimeout(timer)
	}, [])

	const addToast = (message: string, type: 'success' | 'error' = 'success') => {
		const id = `${Date.now()}-${Math.random()}`
		setToasts((prev) => [...prev, { id, message, type }])
		setTimeout(() => setToasts((prev) => prev.filter((tt) => tt.id !== id)), 4000)
	}

	const canEdit = role !== 'logist'

	// Навигация по шагам
	const goTo = (i: number) => {
		setStep(i)
		setMaxStep((m) => Math.max(m, i))
	}
	const next = () => goTo(Math.min(step + 1, STEPS.length - 1))
	const back = () => setStep((s) => Math.max(0, s - 1))

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

	const save = async () => {
		if (!waybill.receiver.fullName.trim() || !waybill.receiver.phone.trim()) {
			addToast('Заполните ФИО и телефон получателя', 'error')
			return
		}
		const number = waybill.number ?? nextWaybillNumber()
		const status = waybill.status === 'draft' ? 'active' : waybill.status
		setWaybill((w) => ({ ...w, number, status }))

		// Демо: кладём накладную в песочницу как груз (появится в списке и трекинге).
		// В проде — запись в БД (Waybill + WaybillItem) с unique-номером.
		try {
			const payload = {
				cargoNumber: number,
				name: waybill.nature || waybill.positions.find((p) => p.name.trim())?.name || null,
				fromCity: waybill.sender.city || 'Алматы',
				currentCity: waybill.sender.city || 'Алматы',
				toCity: waybill.receiver.city || '—',
				status: status === 'delivered' ? 'прибыл' : 'ожидает отправления',
				acceptanceDate: waybill.acceptanceDate || null,
				deliveryAmount: waybill.amount || null,
				currency: 'KZT',
				paymentStatus: 'none' as const,
			}
			if (createdDocId) {
				await repo.cargos.update(createdDocId, payload)
			} else {
				const created = await repo.cargos.create({ id: `CARGO-${number}`, ...payload })
				setCreatedDocId(created.docId)
			}
		} catch {
			/* демо — ошибки хранилища игнорируем */
		}

		addToast(`Накладная №${number} сохранена (демо)`)
	}

	const reset = () => {
		setWaybill({ ...initialWaybill(), acceptanceDate: new Date().toISOString().slice(0, 10) })
		setCreatedDocId(null)
		setStep(0)
		setMaxStep(0)
		addToast('Форма очищена')
	}

	const sendNotify = () => {
		if (!waybill.receiver.phone.trim()) {
			addToast('Укажите телефон получателя', 'error')
			return
		}
		setNotify(true)
	}

	if (!mounted) return <div suppressHydrationWarning />
	if (!minLoadDone) return <PageLoader />

	return (
		<div
			className="min-h-screen bg-slate-50"
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

			{notify && (
				<NotifyModal
					phone={waybill.receiver.phone}
					text={notificationText(waybill)}
					onClose={() => setNotify(false)}
				/>
			)}

			<div className="lg:ml-64 min-h-screen flex flex-col">
				<main className="flex-1 p-4 sm:p-6 pb-12">
					<div className="max-w-4xl mx-auto">
						{/* Демо-уведомление */}
						<div className="mb-5 flex items-center gap-2 text-xs sm:text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2">
							<FlaskConical className="w-4 h-4 shrink-0 text-amber-500" />
							<span>Демо-режим: данные не сохраняются в базу. Прототип для согласования по ТЗ v2.0.</span>
						</div>

						{/* Header */}
						<div className="mb-5 flex flex-wrap items-start gap-3">
							<div className="flex-1 min-w-0">
								<div className="flex items-center gap-2.5">
									<h2 className="text-lg font-semibold text-slate-900">Создать груз</h2>
									{waybill.number && (
										<span className="text-sm font-semibold text-orange-600 bg-orange-50 border border-orange-100 rounded-md px-2 py-0.5">
											№{waybill.number}
										</span>
									)}
								</div>
								<p className="text-slate-500 text-xs mt-0.5">Шаг {step + 1} из {STEPS.length} · {STEPS[step]}</p>
							</div>
							<RoleSwitcher
								role={role}
								onChange={setRole}
							/>
						</div>

						{/* Роль «Логист» — только просмотр */}
						{!canEdit && (
							<div className="mb-4 flex items-center gap-2 text-[13px] bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-3.5 py-2.5">
								<Info className="w-4 h-4 shrink-0" />
								Роль «Логист»: форма доступна только для просмотра. Редактирование — у Оператора / Администратора.
							</div>
						)}

						{/* Индикатор шагов */}
						<div className="mb-4">
							<Stepper
								steps={STEPS}
								current={step}
								maxReached={maxStep}
								onStep={goTo}
							/>
						</div>

						{/* Контент текущего шага */}
						<div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 sm:p-6">
							{step === 0 && (
								<WaybillForm
									value={waybill}
									onChange={setWaybill}
									readOnly={!canEdit}
									only={['sender', 'receiver']}
								/>
							)}

							{step === 1 && (
								<WaybillForm
									value={waybill}
									onChange={setWaybill}
									readOnly={!canEdit}
									only={['cargo']}
								/>
							)}

							{step === 2 && (
								<div className="flex flex-col gap-6">
									<WaybillForm
										value={waybill}
										onChange={setWaybill}
										readOnly={!canEdit}
										only={['payment']}
									/>
									<div className="pt-6 border-t border-slate-100">
										<div className="flex items-center justify-between gap-3 mb-4">
											<div className="flex items-center gap-3 min-w-0">
												<span className="w-9 h-9 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
													<Calculator className="w-[18px] h-[18px]" />
												</span>
												<div className="min-w-0">
													<h3 className="text-[15px] font-semibold text-slate-900 leading-tight">Калькулятор стоимости</h3>
													<p className="text-xs text-slate-400 mt-0.5">Итог подставится в «Сумму к оплате»</p>
												</div>
											</div>
											{canEdit && (
												<button
													type="button"
													onClick={fillCalcFromWaybill}
													className="text-xs font-medium text-orange-600 hover:text-orange-700 whitespace-nowrap shrink-0">
													Заполнить из накладной →
												</button>
											)}
										</div>
										<CalculatorForm
											key={calcKey}
											showDisclaimer={false}
											prefill={prefill}
											onResult={onCalcResult}
										/>
									</div>
								</div>
							)}

							{step === 3 && (
								<div className="flex flex-col gap-6">
									<WaybillForm
										value={waybill}
										onChange={setWaybill}
										readOnly={!canEdit}
										only={['header', 'extras']}
									/>
									<div className="pt-6 border-t border-slate-100">
										<h3 className="text-[15px] font-semibold text-slate-900 mb-1">Данные для логистов</h3>
										<p className="text-xs text-slate-400 mb-4">Автосводка по накладной — скопировать или отправить</p>
										<LogistSummary waybill={waybill} />
									</div>
									{canEdit && (
										<div className="flex flex-wrap gap-2 pt-4 border-t border-slate-100">
											<button
												type="button"
												onClick={save}
												className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors">
												<Save className="w-4 h-4" /> Сохранить накладную
											</button>
											<button
												type="button"
												onClick={() => openWaybillPrint(waybill)}
												className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:border-orange-300 text-slate-700 font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors">
												<FileDown className="w-4 h-4" /> Скачать PDF
											</button>
											<button
												type="button"
												onClick={sendNotify}
												className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:border-orange-300 text-slate-700 font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors">
												<Bell className="w-4 h-4" /> Уведомить клиента
											</button>
											<button
												type="button"
												onClick={reset}
												className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 font-medium px-3 py-2.5 rounded-lg text-sm transition-colors ml-auto">
												<RotateCcw className="w-4 h-4" /> Очистить
											</button>
										</div>
									)}
								</div>
							)}
						</div>

						{/* Навигация по шагам */}
						<div className="mt-4 flex items-center justify-between gap-3">
							<button
								type="button"
								onClick={back}
								disabled={step === 0}
								className="inline-flex items-center gap-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
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
					</div>
				</main>
				<footer className="text-center text-slate-400 text-xs py-4 px-4">{t('adminFooter')}</footer>
			</div>
		</div>
	)
}
