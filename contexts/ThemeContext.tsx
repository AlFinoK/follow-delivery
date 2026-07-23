'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

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
	// подставляем после монтирования; .dark применяется в AdminThemeShell по `dark`,
	// а контент админки и так скрыт за PageLoader до монтирования — «моргания» не видно.
	const [theme, setTheme] = useState<Theme>('light')
	useEffect(() => {
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
