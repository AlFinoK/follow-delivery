import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { LangProvider } from '@/contexts/LangContext'

const inter = Inter({
	subsets: ['latin', 'cyrillic'],
	variable: '--font-inter',
	display: 'swap',
})

export const metadata: Metadata = {
	title: 'Leader Trans Team - Отслеживание грузов в реальном времени',
	description: 'Система отслеживания доставки грузов. Отследите ваш груз прямо сейчас!',
	icons: {
		icon: '/logo.png',
	},
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html
			lang="ru"
			suppressHydrationWarning
			className={inter.variable}>
			<head>
				<link
					rel="icon"
					href="/logo.png"
					type="image/png"
				/>
			</head>
			<body
				suppressHydrationWarning
				className={inter.className}>
				<LangProvider>{children}</LangProvider>
</body>
		</html>
	)
}
