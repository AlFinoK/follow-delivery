'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLang } from '@/contexts/LangContext'
import { ToastItem } from '@/components/Toast'
import { AdminNav } from '@/components/admin/AdminNav'
import { CargoList } from '@/components/admin/CargoList'
import { PageLoader } from '@/components/PageLoader'
import type { Toast } from '@/components/Toast'
import type { Cargo } from '@/components/admin/types'

export default function Admin() {
	const { t } = useLang()
	const [mounted, setMounted] = useState(false)
	const [minLoadDone, setMinLoadDone] = useState(false)
	const [cargos, setCargos] = useState<Cargo[]>([])
	const [loadingCargos, setLoadingCargos] = useState(false)
	const [toasts, setToasts] = useState<Toast[]>([])

	const addToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
		const id = Date.now().toString()
		setToasts((prev) => [...prev, { id, message, type }])
		setTimeout(() => {
			setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)))
			setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 350)
		}, 5000)
	}, [])

	const loadCargos = useCallback(async () => {
		setLoadingCargos(true)
		try {
			const res = await fetch('/api/cargos')
			if (!res.ok) throw new Error()
			setCargos(await res.json())
		} catch {
			addToast(t('loadError'), 'error')
		} finally {
			setLoadingCargos(false)
		}
	}, [addToast, t])

	useEffect(() => {
		setMounted(true)
		loadCargos()
		const timer = setTimeout(() => setMinLoadDone(true), 444)
		return () => clearTimeout(timer)
	}, [loadCargos])

	useEffect(() => {
		const pending = sessionStorage.getItem('pendingToast')
		if (pending) {
			try {
				const { message, type } = JSON.parse(pending)
				addToast(message, type)
			} catch {}
			sessionStorage.removeItem('pendingToast')
		}
	}, [addToast])

	if (!mounted) return <div suppressHydrationWarning />

	if (!minLoadDone || (loadingCargos && cargos.length === 0)) return <PageLoader />

	return (
		<div
			className="min-h-screen flex flex-col bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50"
			suppressHydrationWarning>
			{/* Toasts */}
			<div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-xs">
				{toasts.map((toast) => (
					<ToastItem
						key={toast.id}
						toast={toast}
					/>
				))}
			</div>

			<AdminNav />

			<main className="flex-1 p-4 sm:p-6 pb-12">
				<div className="max-w-4xl mx-auto">
					<CargoList
						cargos={cargos}
						loadingCargos={loadingCargos}
					/>
					<div className="mt-8 text-center text-gray-500 text-xs sm:text-sm">
						<p>{t('adminFooter')}</p>
					</div>
				</div>
			</main>
		</div>
	)
}
