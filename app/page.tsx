'use client'

import { useState, useEffect } from 'react'
import { useLang } from '@/contexts/LangContext'
import { LangSwitcher } from '@/components/LangSwitcher'
import { ToastItem } from '@/components/Toast'
import { SearchSection } from '@/components/home/SearchSection'
import { CargoResultCard } from '@/components/home/CargoResultCard'
import { PageLoader } from '@/components/PageLoader'
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

export default function Home() {
	const { t } = useLang()
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

	return (
		<div
			className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex flex-col"
			suppressHydrationWarning>
			{/* Background decorations */}
			<div
				className="fixed inset-0 pointer-events-none overflow-hidden"
				aria-hidden>
				<div className="absolute -top-32 -right-32 w-96 h-96 bg-orange-200/30 rounded-full blur-3xl" />
				<div className="absolute -bottom-32 -left-32 w-96 h-96 bg-amber-200/30 rounded-full blur-3xl" />
			</div>

			{/* Toast Notifications */}
			<div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
				{toasts.map((toast) => (
					<ToastItem
						key={toast.id}
						toast={toast}
					/>
				))}
			</div>

			{/* Header */}
			<header className="relative z-10 bg-white/70 backdrop-blur-xl border-b border-orange-100 shadow-sm flex-shrink-0">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
					<div className="flex items-center gap-2 sm:gap-3 min-w-0">
						<img
							src="/logo.png"
							alt="Leader Trans Team"
							className="w-9 h-9 sm:w-11 sm:h-11 object-contain shrink-0"
						/>
						<div className="min-w-0">
							<h1 className="text-base sm:text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-600 leading-tight truncate">
								Leader Trans Team
							</h1>
							<p className="text-[10px] sm:text-xs text-orange-500/80 font-bold tracking-[0.2em] uppercase hidden sm:block">
								{t('headerSubtitle')}
							</p>
						</div>
					</div>
					<div className="shrink-0">
						<LangSwitcher />
					</div>
				</div>
			</header>

			{/* Main */}
			<main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-10 sm:py-16">
				<div className="w-full max-w-xl">
					{!cargo ? (
						<SearchSection
							trackingId={trackingId}
							loading={loading}
							onTrackingIdChange={setTrackingId}
							onSubmit={handleSubmit}
						/>
					) : (
						<CargoResultCard
							cargo={cargo}
							onNewSearch={() => setCargo(null)}
						/>
					)}
				</div>
			</main>

			{/* Footer */}
			<footer className="relative z-10 text-center py-4 pb-6">
				<p className="text-gray-400 text-xs font-medium">{t('footer')}</p>
			</footer>
		</div>
	)
}
