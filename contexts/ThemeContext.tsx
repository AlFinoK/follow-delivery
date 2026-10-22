'use client'

import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from 'react'

type Theme = 'light' | 'dark'
const KEY = 'ltt-theme'

// Сохранённая тема из localStorage, иначе системная.
function readInitial(): Theme {
	if (typeof window === 'undefined') return 'light'
	try {
		const stored = localStorage.getItem(KEY)
		if (stored === 'light' || stored === 'dark') return stored
	} catch {}
	return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const ThemeContext = createContext<{ theme: Theme; dark: boolean; toggle: () => void }>({
	theme: 'light',
	dark: false,
	toggle: () => {},
})

export function ThemeProvider({ children }: { children: ReactNode }) {
	// Старт с 'light' — совпадает с SSR (без ошибки гидратации). Реальную тему
	// подставляем после монтирования в layout-эффекте (до первой отрисовки); .dark применяется
	// в AdminThemeShell по `dark` тоже в layout-эффекте — светлого кадра перед тёмным нет.
	const [theme, setTheme] = useState<Theme>('light')
	useLayoutEffect(() => {
		setTheme(readInitial())
	}, [])
	const toggle = () =>
		setTheme((prev) => {
			const next: Theme = prev === 'dark' ? 'light' : 'dark'
			try {
				localStorage.setItem(KEY, next)
			} catch {}
			return next
		})
	return <ThemeContext.Provider value={{ theme, dark: theme === 'dark', toggle }}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
