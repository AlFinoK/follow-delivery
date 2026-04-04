'use client'

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
		{ icon: '⚡', label: t('featureInstant') },
		{ icon: '📡', label: t('featureRealtime') },
		{ icon: '🔒', label: t('featureSecure') },
	]

	return (
		<>
			{/* Hero */}
			<div className="text-center mb-8 sm:mb-10">
				<p className="inline-block text-xs font-bold text-orange-500 bg-orange-100 border border-orange-200 rounded-full px-3 py-1 mb-4 tracking-wider uppercase">
					{t('realtimeBadge')}
				</p>
				<h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4 leading-[1.1] tracking-tight">
					{t('heroTitle')}
					<span className="text-orange-500">?</span>
				</h2>
				<p className="text-gray-500 text-sm sm:text-base max-w-sm mx-auto leading-relaxed">{t('heroSubtitle')}</p>
			</div>

			{/* Search Card */}
			<div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl shadow-orange-100/60 p-6 sm:p-8 border border-orange-100/80">
				<form onSubmit={onSubmit} className="flex flex-col gap-4">
					<div className="relative">
						<input
							type="text"
							value={trackingId}
							onChange={(e) => onTrackingIdChange(e.target.value)}
							placeholder={t('trackInputPlaceholder')}
							className="w-full pl-5 pr-12 py-4 bg-gray-50 border-2 border-orange-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-400/15 transition-all text-sm sm:text-base font-medium"
							required
						/>
						<span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg select-none">🔍</span>
					</div>
					<button
						type="submit"
						disabled={loading}
						className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-4 rounded-xl hover:shadow-lg hover:shadow-orange-300/50 disabled:opacity-60 disabled:cursor-not-allowed transition-all text-sm sm:text-base hover:scale-[1.02] active:scale-[0.98]">
						{loading ? (
							<span className="flex items-center justify-center gap-2">
								<Spinner />
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
				{features.map((f) => (
					<div key={f.label} className="bg-white/60 rounded-xl p-3 border border-orange-100">
						<p className="text-xl mb-1">{f.icon}</p>
						<p className="text-[11px] text-gray-500 font-medium leading-tight">{f.label}</p>
					</div>
				))}
			</div>
		</>
	)
}
