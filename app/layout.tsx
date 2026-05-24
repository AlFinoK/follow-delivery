import type { Metadata } from 'next'
import 'react-day-picker/style.css'
import './globals.css'
import { LangProvider } from '@/contexts/LangContext'

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
			suppressHydrationWarning>
			<head>
				<link
					rel="preconnect"
					href="https://fonts.googleapis.com"
				/>
				<link
					rel="preconnect"
					href="https://fonts.gstatic.com"
					crossOrigin="anonymous"
				/>
				<link
					href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
					rel="stylesheet"
				/>
				<link
					rel="icon"
					href="/logo.png"
					type="image/png"
				/>
			</head>
			<body
				suppressHydrationWarning
				style={{ fontFamily: "'Inter', sans-serif" }}>
				<LangProvider>{children}</LangProvider>
</body>
		</html>
	)
}
