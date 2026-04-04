'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/contexts/LangContext'
import { ToastItem } from '@/components/Toast'
import { AdminNav } from '@/components/admin/AdminNav'
import { NewCargoForm } from '@/components/admin/NewCargoForm'
import type { Toast } from '@/components/Toast'

export default function NewCargoPage() {
	const router = useRouter()
	const { t } = useLang()
	const [toasts, setToasts] = useState<Toast[]>([])

	const addToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
		const id = Date.now().toString()
		setToasts((prev) => [...prev, { id, message, type }])
		setTimeout(() => {
			setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)))
			setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 350)
		}, 5000)
	}, [])

	const handleCreated = async () => {
		router.push('/admin')
	}

	return (
		<div className="h-screen flex flex-col bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 overflow-hidden">
			{/* Toasts */}
			<div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-xs">
				{toasts.map((toast) => (
					<ToastItem key={toast.id} toast={toast} />
				))}
			</div>

			<AdminNav />

			<main className="flex-1 overflow-y-auto">
				<div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
					{/* Back + title */}
					<div className="flex items-center justify-between gap-3 mb-6">
						<button
							onClick={() => router.back()}
							className="flex items-center gap-1.5 text-orange-600 hover:text-orange-700 font-semibold text-sm transition-colors flex-shrink-0">
							<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
								<path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
							</svg>
							{t('backToList')}
						</button>
						<div className="flex items-center gap-2">
							<span className="text-xl">➕</span>
							<h1 className="text-xl font-black text-gray-900">{t('newCargoTitle')}</h1>
						</div>
					</div>

					<NewCargoForm onCreated={handleCreated} addToast={addToast} wide />
				</div>
			</main>
		</div>
	)
}
