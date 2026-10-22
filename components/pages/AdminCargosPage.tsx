'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLang } from '@/contexts/LangContext'
import { TOAST_VIEWPORT, ToastItem, newToastId } from '@/components/Toast'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { CargoList } from '@/components/admin/CargoList'
import type { Toast } from '@/components/Toast'

export function AdminCargosPage() {
	const { t } = useLang()
	const [mounted, setMounted] = useState(false)
	const [toasts, setToasts] = useState<Toast[]>([])

	const addToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
		const id = newToastId()
		setToasts((prev) => [...prev, { id, message, type }])
		setTimeout(() => {
			setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)))
			setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 350)
		}, 5000)
	}, [])

	const handleListError = useCallback((msg: string) => addToast(msg, 'error'), [addToast])

	useEffect(() => {
		setMounted(true)
	}, [])

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

	return (
		<div className="min-h-screen bg-slate-50 dark:bg-zinc-950" suppressHydrationWarning>
			<AdminSidebar />

			<div className="lg:ml-64 min-h-screen flex flex-col">
				<div className={TOAST_VIEWPORT}>
					{toasts.map((toast) => (
						<ToastItem key={toast.id} toast={toast} />
					))}
				</div>

				<main className="flex-1 p-4 sm:p-6 pb-12">
					<div className="max-w-4xl mx-auto">
						<CargoList onError={handleListError} />
					</div>
				</main>
				<footer className="text-center text-slate-400 dark:text-zinc-500 text-xs py-4 px-4">{t('adminFooter')}</footer>
			</div>
		</div>
	)
}
