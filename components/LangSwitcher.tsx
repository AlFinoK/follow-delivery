'use client'

import { useLang } from '@/contexts/LangContext'

export function LangSwitcher() {
	const { lang, setLang } = useLang()

	return (
		<div className="flex items-center bg-orange-50 border border-orange-200 rounded-lg p-0.5 text-xs font-bold select-none">
			<button
				onClick={() => setLang('ru')}
				className={`px-2.5 py-1 rounded-md transition-all ${
					lang === 'ru'
						? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm'
						: 'text-orange-400 hover:text-orange-600'
				}`}>
				РУ
			</button>
			<button
				onClick={() => setLang('kk')}
				className={`px-2.5 py-1 rounded-md transition-all ${
					lang === 'kk'
						? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm'
						: 'text-orange-400 hover:text-orange-600'
				}`}>
				ҚАЗ
			</button>
		</div>
	)
}
