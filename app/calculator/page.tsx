'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { LangSwitcher } from '@/components/LangSwitcher'
import { PageLoader } from '@/components/PageLoader'
import { CalculatorForm } from '@/components/calculator/CalculatorForm'

export default function CalculatorPage() {
	const { t } = useLang()
	const [mounted, setMounted] = useState(false)
	const [minLoadDone, setMinLoadDone] = useState(false)

	useEffect(() => {
		setMounted(true)
		const timer = setTimeout(() => setMinLoadDone(true), 444)
		return () => clearTimeout(timer)
	}, [])

	if (!mounted || !minLoadDone) return <PageLoader />

	return (
		<div className="min-h-screen bg-slate-50 flex flex-col" suppressHydrationWarning>
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
					<div className="flex items-center gap-2 sm:gap-3">
						<Link
							href="/"
							className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors">
							<ArrowLeft className="w-4 h-4" />
							<span className="hidden sm:inline">{t('calcBackToTracking')}</span>
						</Link>
						<LangSwitcher />
					</div>
				</div>
			</header>

			{/* Main */}
			<main className="flex-1 px-4 py-8 sm:py-12">
				<div className="w-full max-w-5xl mx-auto">
					<div className="text-center mb-8">
						<p className="inline-block text-[11px] font-semibold text-orange-700 bg-orange-50 border border-orange-100 rounded-full px-3 py-1 mb-4 tracking-wide">
							{t('calcBadge')}
						</p>
						<h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 mb-3 tracking-tight">
							{t('calcTitle')}
						</h1>
						<p className="text-slate-500 text-sm max-w-lg mx-auto leading-relaxed">{t('calcSubtitle')}</p>
					</div>

					<CalculatorForm />
				</div>
			</main>

			{/* Footer */}
			<footer className="text-center py-4">
				<p className="text-slate-400 text-xs">{t('footer')}</p>
			</footer>
		</div>
	)
}
