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
			className="min-h-screen bg-slate-50 flex flex-col"
			suppressHydrationWarning>
			{/* Toast Notifications */}
			<div className="fixed top-20 right-4 z-50 flex flex-col gap-2 max-w-sm">
				{toasts.map((toast) => (
					<ToastItem key={toast.id} toast={toast} />
				))}
			</div>

			{/* Header */}
			<header className="bg-white border-b border-slate-200">
				<div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
					<div className="flex items-center gap-2.5 min-w-0">
						<img
							src="/logo.png"
							alt="Leader Trans Team"
							className="w-8 h-8 sm:w-9 sm:h-9 object-contain shrink-0"
						/>
						<div className="min-w-0 leading-tight">
							<p className="text-sm sm:text-base font-semibold text-slate-900 truncate">Leader Trans Team</p>
							<p className="text-[11px] text-slate-500 hidden sm:block">{t('headerSubtitle')}</p>
						</div>
					</div>
					<LangSwitcher />
				</div>
			</header>

			{/* Main */}
			<main className="flex-1 flex flex-col items-center justify-center px-4 py-10 sm:py-16">
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
			<footer className="text-center py-4">
				<p className="text-slate-400 text-xs">{t('footer')}</p>
			</footer>
		</div>
	)
}
