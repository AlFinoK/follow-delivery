'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { ToastItem } from '@/components/Toast'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
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
		<div className="min-h-screen bg-slate-50">
			<AdminSidebar />

			<div className="lg:ml-64 min-h-screen flex flex-col">
				<div className="fixed top-20 lg:top-4 right-4 z-50 flex flex-col gap-2 max-w-xs">
					{toasts.map((toast) => (
						<ToastItem key={toast.id} toast={toast} />
					))}
				</div>

				<main className="flex-1 overflow-y-auto">
					<div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
						<div className="flex items-center justify-between gap-3 mb-5">
							<button
								onClick={() => router.back()}
								className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-900 font-medium text-sm transition-colors">
								<ArrowLeft className="w-4 h-4" />
								{t('backToList')}
							</button>
							<h1 className="text-lg font-semibold text-slate-900">{t('newCargoTitle')}</h1>
						</div>

						<NewCargoForm onCreated={handleCreated} addToast={addToast} wide />
					</div>
				</main>
			</div>
		</div>
	)
}
