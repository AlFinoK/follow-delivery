'use client'

import { useEffect, useState } from 'react'
import { useLang } from '@/contexts/LangContext'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { PageLoader } from '@/components/PageLoader'
import { CalculatorForm } from '@/components/calculator/CalculatorForm'

export function AdminCalculatorPage() {
	const { t } = useLang()
	const [mounted, setMounted] = useState(false)
	const [minLoadDone, setMinLoadDone] = useState(false)

	useEffect(() => {
		setMounted(true)
		const timer = setTimeout(() => setMinLoadDone(true), 444)
		return () => clearTimeout(timer)
	}, [])

	if (!mounted) return <div suppressHydrationWarning />
	if (!minLoadDone) return <PageLoader />

	return (
		<div className="min-h-screen bg-slate-50 dark:bg-zinc-950" suppressHydrationWarning>
			<AdminSidebar />

			<div className="lg:ml-64 min-h-screen flex flex-col">
				<main className="flex-1 p-4 sm:p-6 pb-12">
					<div className="max-w-5xl mx-auto">
						<div className="mb-6">
							<h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">{t('calcTitle')}</h2>
							<p className="text-slate-500 dark:text-zinc-400 text-xs mt-0.5">{t('calcSubtitle')}</p>
						</div>

						<CalculatorForm showDisclaimer={false} />
					</div>
				</main>
				<footer className="text-center text-slate-400 dark:text-zinc-500 text-xs py-4 px-4">{t('adminFooter')}</footer>
			</div>
		</div>
	)
}
