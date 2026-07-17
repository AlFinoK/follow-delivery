import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { DemoProvider } from '@/contexts/DemoContext'
import { DemoRibbon } from '@/components/demo/DemoRibbon'

// Демо-прослойка. Всё под /demo:
//  • оборачивается в DemoProvider → компоненты берут демо-репозиторий (sessionStorage,
//    без реальных данных) и строят ссылки от basePath '/demo';
//  • помечается noindex (не индексируется поисковиками);
//  • при NEXT_PUBLIC_DEMO='off' полностью выключается (404).
export const metadata: Metadata = {
	title: 'Демо · Leader Trans Team',
	robots: { index: false, follow: false },
}

export default function DemoLayout({ children }: { children: React.ReactNode }) {
	if (process.env.NEXT_PUBLIC_DEMO === 'off') notFound()
	return (
		<DemoProvider>
			{children}
			<DemoRibbon />
		</DemoProvider>
	)
}
