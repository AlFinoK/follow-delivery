'use client'

import { useState, useEffect } from 'react'
import { Search, Calculator, Zap, Radio } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { LangSwitcher } from '@/components/LangSwitcher'
import { ToastItem } from '@/components/Toast'
import { CargoResultCard } from '@/components/home/CargoResultCard'
import { CalculatorForm } from '@/components/calculator/CalculatorForm'
import { PageLoader } from '@/components/PageLoader'
import { Spinner } from '@/components/Spinner'
import type { Toast } from '@/components/Toast'

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

type Tab = 'track' | 'calc'

// Калькулятор временно скрыт с главной — менеджеры тестируют его через /admin/calculator.
// Чтобы показать калькулятор всем пользователям, поставить true.
const SHOW_CALCULATOR = false

export default function Home() {
	const { t } = useLang()
	const [tab, setTab] = useState<Tab>('track')
	const [trackingId, setTrackingId] = useState<string>('')
	const [cargo, setCargo] = useState<CargoData | null>(null)
	const [loading, setLoading] = useState<boolean>(false)
	const [mounted, setMounted] = useState<boolean>(false)
	const [minLoadDone, setMinLoadDone] = useState<boolean>(false)
	const [toasts, setToasts] = useState<Toast[]>([])

	useEffect(() => {
		setMounted(true)
		const timer = setTimeout(() => setMinLoadDone(true), 2000)
		return () => clearTimeout(timer)
	}, [])

	const addToast = (message: string, type: 'success' | 'error' = 'success') => {
		const id = Date.now().toString()
		setToasts((prev) => [...prev, { id, message, type }])
		setTimeout(() => {
			setToasts((prev) => prev.filter((t) => t.id !== id))
		}, 5000)
	}

	const handleSubmit = async (e: React.SyntheticEvent) => {
		e.preventDefault()
		setCargo(null)
		setLoading(true)

		const searchId = trackingId.trim().toUpperCase()
		if (!searchId) {
			addToast(t('enterCargoId'), 'error')
			setLoading(false)
			return
		}

		try {
			const res = await fetch(`/api/cargos?trackingId=${encodeURIComponent(searchId)}`)
			if (res.status === 404) {
				addToast(t('cargoNotFound'), 'error')
			} else if (!res.ok) {
				addToast(t('searchError'), 'error')
			} else {
				const data = await res.json()
				setCargo(data)
				setTrackingId('')
				addToast(t('cargoFound'), 'success')
			}
		} catch {
			addToast(t('searchError'), 'error')
		} finally {
			setLoading(false)
		}
	}

	if (!mounted || !minLoadDone) return <PageLoader />

	const features = [
		{ Icon: Zap, label: t('featureInstant') },
		{ Icon: Radio, label: t('featureRealtime') },
	]

	const tabs = [
		{ id: 'track' as const, Icon: Search, label: t('tabTrack'), short: t('tabTrackShort') },
		{ id: 'calc' as const, Icon: Calculator, label: t('tabCalc'), short: t('tabCalcShort') },
	]

	return (
		<div
			className="min-h-screen xl:grid xl:grid-cols-[38%_62%] bg-slate-50"
			suppressHydrationWarning>
			{/* Toasts */}
			<div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
				{toasts.map((toast) => (
					<ToastItem key={toast.id} toast={toast} />
				))}
			</div>

			{/* ── Left: brand panel ── */}
			<aside className="relative overflow-hidden flex flex-col p-8 sm:p-10 xl:p-12 text-white xl:sticky xl:top-0 xl:h-screen bg-gradient-to-b from-slate-900 to-slate-950">
				{/* subtle dot grid */}
				<div
					className="absolute inset-0 opacity-[0.06]"
					style={{
						backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)',
						backgroundSize: '26px 26px',
					}}
					aria-hidden
				/>
				{/* soft top highlight for depth */}
				<div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[40rem] h-[40rem] rounded-full bg-white/[0.04] blur-3xl" aria-hidden />

				{/* top: brand + lang */}
				<div className="relative flex items-center justify-between gap-3">
					<div className="flex items-center gap-2.5 min-w-0">
						<img src="/logo.png" alt="Leader Trans Team" className="w-9 h-9 object-contain shrink-0" />
						<div className="min-w-0 leading-tight">
							<p className="text-sm font-semibold text-white truncate">Leader Trans Team</p>
							<p className="text-[11px] text-slate-400">{t('headerSubtitle')}</p>
						</div>
					</div>
					<LangSwitcher />
				</div>

				{/* middle: hero copy */}
				<div className="relative flex-1 flex flex-col justify-center py-12 xl:py-0 max-w-md ltt-fade-up">
					<div className="w-10 h-1 rounded-full bg-orange-500 mb-6" />
					<h1 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-[1.12]">
						{t('homeHeroTitle')}
					</h1>
					<p className="mt-4 text-slate-300 text-sm sm:text-[15px] leading-relaxed max-w-sm">
						{t('homeHeroSubtitle')}
					</p>

					<ul className="mt-9 space-y-3.5">
						{features.map(({ Icon, label }) => (
							<li key={label} className="flex items-center gap-3">
								<span className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 border border-white/10 backdrop-blur">
									<Icon className="w-4 h-4 text-orange-400" />
								</span>
								<span className="text-sm text-slate-200">{label}</span>
							</li>
						))}
					</ul>
				</div>

				{/* bottom: only on tall (xl) panel */}
				<p className="relative hidden xl:block text-[11px] text-slate-500">{t('footer')}</p>
			</aside>

			{/* ── Right: dashboard ── */}
			<section className="relative flex flex-col xl:min-h-screen">
				<div className="flex-1 flex flex-col xl:justify-center px-5 sm:px-8 xl:px-14 py-10 sm:py-14">
					<div className="w-full max-w-3xl mx-auto">
						{/* Segmented tabs (hidden while the calculator is gated) */}
						{SHOW_CALCULATOR && (
						<div className="flex justify-center xl:justify-start mb-6">
							<div className="flex w-full sm:w-auto sm:inline-flex items-center bg-slate-100 rounded-xl p-1">
								{tabs.map(({ id, Icon, label, short }) => {
									const active = tab === id
									return (
										<button
											key={id}
											type="button"
											onClick={() => setTab(id)}
											className={`flex-1 sm:flex-initial justify-center inline-flex items-center gap-2 px-3 sm:px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
												active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
											}`}>
											<Icon className={`w-4 h-4 shrink-0 ${active ? 'text-orange-500' : 'text-slate-400'}`} />
											<span className="whitespace-nowrap sm:hidden">{short}</span>
											<span className="whitespace-nowrap hidden sm:inline">{label}</span>
										</button>
									)
								})}
							</div>
						</div>

						)}

						{/* Tab content */}
						<div key={tab} className="ltt-fade-up">
							{!SHOW_CALCULATOR || tab === 'track' ? (
								<div className="max-w-md mx-auto">
									{!cargo ? (
										<div className="bg-white rounded-2xl border border-slate-200/70 shadow-[0_1px_3px_rgba(15,23,42,0.04),0_18px_50px_-20px_rgba(15,23,42,0.22)] p-5 sm:p-6">
											<p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-3">
												{t('tabTrack')}
											</p>
											<form onSubmit={handleSubmit} className="flex flex-col gap-3">
												<div className="relative">
													<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
													<input
														type="text"
														value={trackingId}
														onChange={(e) => setTrackingId(e.target.value)}
														placeholder={t('trackInputPlaceholder')}
														className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all text-sm font-medium"
														required
													/>
												</div>
												<button
													type="submit"
													disabled={loading}
													className="w-full bg-orange-500 hover:bg-orange-600 active:scale-[0.99] text-white font-semibold py-3 rounded-xl disabled:opacity-60 disabled:cursor-not-allowed transition-all text-sm shadow-sm shadow-orange-500/20">
													{loading ? (
														<span className="inline-flex items-center justify-center gap-2">
															<Spinner className="w-4 h-4 text-white" />
															{t('searching')}
														</span>
													) : (
														t('trackButton')
													)}
												</button>
											</form>
										</div>
									) : (
										<CargoResultCard cargo={cargo} onNewSearch={() => setCargo(null)} />
									)}
								</div>
							) : (
								<CalculatorForm />
							)}
						</div>
					</div>
				</div>

				{/* footer on small screens */}
				<footer className="xl:hidden text-center py-5">
					<p className="text-slate-400 text-xs">{t('footer')}</p>
				</footer>
			</section>
		</div>
	)
}
