'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Lang, TranslationKey, translations } from '@/lib/i18n'

interface LangContextType {
	lang: Lang
	setLang: (lang: Lang) => void
	t: (key: TranslationKey) => string
	tf: (key: TranslationKey, params: Record<string, string | number>) => string
}

const LangContext = createContext<LangContextType | null>(null)

export function LangProvider({ children }: { children: ReactNode }) {
	const [lang, setLangState] = useState<Lang>('ru')

	useEffect(() => {
		const saved = localStorage.getItem('lang')
		if (saved === 'ru' || saved === 'kk') {
			setLangState(saved)
		}
	}, [])

	const setLang = (newLang: Lang) => {
		setLangState(newLang)
		localStorage.setItem('lang', newLang)
	}

	const t = (key: TranslationKey): string => translations[lang][key]

	const tf = (key: TranslationKey, params: Record<string, string | number>): string => {
		let result = translations[lang][key]
		for (const [k, v] of Object.entries(params)) {
			result = result.replace(`{${k}}`, String(v))
		}
		return result
	}

	return <LangContext.Provider value={{ lang, setLang, t, tf }}>{children}</LangContext.Provider>
}

export function useLang() {
	const ctx = useContext(LangContext)
	if (!ctx) throw new Error('useLang must be used within LangProvider')
	return ctx
}
