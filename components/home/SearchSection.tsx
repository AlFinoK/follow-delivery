'use client'

import { Search, Zap, Radio, ShieldCheck } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { Spinner } from '@/components/Spinner'

interface SearchSectionProps {
	trackingId: string
	loading: boolean
	onTrackingIdChange: (val: string) => void
	onSubmit: (e: React.SyntheticEvent) => void
}

export function SearchSection({ trackingId, loading, onTrackingIdChange, onSubmit }: SearchSectionProps) {
	const { t } = useLang()

	const features = [
		{ Icon: Zap, label: t('featureInstant') },
		{ Icon: Radio, label: t('featureRealtime') },
		{ Icon: ShieldCheck, label: t('featureSecure') },
	]

	return (
		<>
			{/* Hero */}
			<div className="text-center mb-8">
				<p className="inline-block text-[11px] font-semibold text-orange-700 bg-orange-50 border border-orange-100 rounded-full px-3 py-1 mb-4 tracking-wide">
					{t('realtimeBadge')}
				</p>
				<h2 className="text-3xl sm:text-4xl font-semibold text-slate-900 mb-3 tracking-tight">
					{t('heroTitle')}
				</h2>
				<p className="text-slate-500 text-sm max-w-sm mx-auto leading-relaxed">{t('heroSubtitle')}</p>
			</div>

			{/* Search Card */}
			<div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
				<form onSubmit={onSubmit} className="flex flex-col gap-3">
					<div className="relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
						<input
							type="text"
							value={trackingId}
							onChange={(e) => onTrackingIdChange(e.target.value)}
							placeholder={t('trackInputPlaceholder')}
							className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all text-sm font-medium"
							required
						/>
					</div>
					<button
						type="submit"
						disabled={loading}
						className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-sm">
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

			{/* Features row */}
			<div className="mt-6 grid grid-cols-3 gap-3 text-center">
				{features.map(({ Icon, label }) => (
					<div key={label} className="bg-white rounded-lg p-3 border border-slate-200">
						<Icon className="w-4 h-4 text-orange-500 mx-auto mb-1.5" />
						<p className="text-xs text-slate-500 font-medium">{label}</p>
					</div>
				))}
			</div>
		</>
	)
}
