'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react'
import { Lang, TranslationKey, translations } from '@/lib/i18n'
import { interpolate } from '@/lib/format'

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
		try {
			const saved = localStorage.getItem('lang')
			if (saved === 'ru' || saved === 'kk') {
				setLangState(saved)
			}
		} catch {}
	}, [])

	// Атрибут lang у <html> следует за языком интерфейса (скринридеры, переносы, проверка орфографии).
	// В разметке на сервере остаётся «ru» — язык известен только после чтения localStorage.
	useEffect(() => {
		document.documentElement.lang = lang
	}, [lang])

	const setLang = useCallback((newLang: Lang) => {
		setLangState(newLang)
		try {
			localStorage.setItem('lang', newLang)
		} catch {}
	}, [])

	// t/tf и значение контекста стабильны, пока не сменился язык: иначе хуки с `t` в зависимостях
	// перезапрашивали бы данные на каждый рендер провайдера (и сразу после гидратации сохранённого «kk»).
	const t = useCallback((key: TranslationKey): string => translations[lang][key], [lang])

	const tf = useCallback(
		(key: TranslationKey, params: Record<string, string | number>): string =>
			interpolate(translations[lang][key], params),
		[lang],
	)

	const value = useMemo(() => ({ lang, setLang, t, tf }), [lang, setLang, t, tf])

	return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

export function useLang() {
	const ctx = useContext(LangContext)
	if (!ctx) throw new Error('useLang must be used within LangProvider')
	return ctx
}
