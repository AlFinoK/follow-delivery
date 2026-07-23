'use client'

import { useLang } from '@/contexts/LangContext'

export function LangSwitcher() {
	const { lang, setLang } = useLang()

	const btnCls = (active: boolean) =>
		`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
			active
				? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-zinc-100 shadow-sm'
				: 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'
		}`

	return (
		<div className="inline-flex items-center bg-slate-100 dark:bg-zinc-800 rounded-lg p-0.5 select-none">
			<button onClick={() => setLang('ru')} className={btnCls(lang === 'ru')}>
				RU
			</button>
			<button onClick={() => setLang('kk')} className={btnCls(lang === 'kk')}>
				KZ
			</button>
		</div>
	)
}
