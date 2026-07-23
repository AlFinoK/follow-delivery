'use client'

import { Moon, Sun } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { useTheme } from '@/contexts/ThemeContext'

// Переключатель темы для админки. Показывает целевой режим (в тёмной — «Светлая тема»).
export function ThemeToggle() {
	const { t } = useLang()
	const { dark, toggle } = useTheme()
	return (
		<button
			type="button"
			onClick={toggle}
			aria-label={dark ? t('themeLight') : t('themeDark')}
			className="w-full inline-flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-zinc-800 transition-colors text-left">
			{dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
			<span>{dark ? t('themeLight') : t('themeDark')}</span>
		</button>
	)
}
