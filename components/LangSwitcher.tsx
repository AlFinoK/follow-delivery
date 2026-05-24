'use client'

import { useLang } from '@/contexts/LangContext'

export function LangSwitcher() {
	const { lang, setLang } = useLang()

	const btnCls = (active: boolean) =>
		`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
			active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
		}`

	return (
		<div className="inline-flex items-center bg-slate-100 rounded-lg p-0.5 select-none">
			<button onClick={() => setLang('ru')} className={btnCls(lang === 'ru')}>
				RU
			</button>
			<button onClick={() => setLang('kk')} className={btnCls(lang === 'kk')}>
				KZ
			</button>
		</div>
	)
}
