'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { TOAST_VIEWPORT, ToastItem, newToastId } from '@/components/Toast'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { NewCargoForm } from '@/components/admin/NewCargoForm'
import type { Toast } from '@/components/Toast'

export function NewCargoPage() {
	const router = useRouter()
	const { t, tf } = useLang()
	const [toasts, setToasts] = useState<Toast[]>([])

	const addToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
		const id = newToastId()
		setToasts((prev) => [...prev, { id, message, type }])
		setTimeout(() => {
			setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)))
			setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 350)
		}, 5000)
	}, [])

	const handleCreated = async (createdId: string) => {
		// Тост «груз создан» показывается уже на списке: локальный state этой страницы
		// при переходе теряется (CLAUDE.md §6) — переносим через sessionStorage.
		try {
			sessionStorage.setItem('pendingToast', JSON.stringify({ message: tf('cargoCreated', { id: createdId }), type: 'success' }))
		} catch {}
		router.push(`/admin`)
	}

	return (
		<div className="min-h-screen bg-slate-50 dark:bg-zinc-950">
			<AdminSidebar />

			<div className="lg:ml-64 min-h-screen flex flex-col">
				<div className={TOAST_VIEWPORT}>
					{toasts.map((toast) => (
						<ToastItem key={toast.id} toast={toast} />
					))}
				</div>

				<main className="flex-1 overflow-y-auto">
					<div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
						{/* Назад + заголовок: оба слева, заголовок под ссылкой (как на карточке груза) */}
						<div className="mb-5">
							<button
								onClick={() => router.back()}
								className="inline-flex items-center gap-1.5 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white font-medium text-sm transition-colors">
								<ArrowLeft className="w-4 h-4" />
								{t('backToList')}
							</button>
							<h1 className="mt-1.5 text-xl font-semibold text-slate-900 dark:text-zinc-100">{t('newCargoTitle')}</h1>
						</div>

						<NewCargoForm onCreated={handleCreated} addToast={addToast} wide />
					</div>
				</main>
			</div>
		</div>
	)
}
