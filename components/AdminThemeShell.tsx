'use client'

import { useEffect, type ReactNode } from 'react'
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext'

// Скоуп тёмной темы: класс .dark вешается на <html>, но ТОЛЬКО пока смонтирована
// админка. При уходе на главную/трекинг layout админки размонтируется → cleanup
// снимает .dark, поэтому публичные страницы всегда светлые. color-scheme: dark
// заодно даёт тёмные нативные элементы (скроллбар, спиннеры полей).
function Scope({ children }: { children: ReactNode }) {
	const { dark } = useTheme()
	useEffect(() => {
		const html = document.documentElement
		html.classList.toggle('dark', dark)
		html.style.colorScheme = dark ? 'dark' : ''
		return () => {
			html.classList.remove('dark')
			html.style.colorScheme = ''
		}
	}, [dark])
	return <>{children}</>
}

export function AdminThemeShell({ children }: { children: ReactNode }) {
	return (
		<ThemeProvider>
			<Scope>{children}</Scope>
		</ThemeProvider>
	)
}
