'use client'

import { signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLang } from '@/contexts/LangContext'
import { LangSwitcher } from '@/components/LangSwitcher'

export function AdminNav() {
	const { t } = useLang()
	const pathname = usePathname()
	const isFolders = pathname.startsWith('/admin/folders')

	const navLinkCls = (active: boolean) =>
		`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
			active
				? 'bg-orange-100 text-orange-700 border border-orange-200'
				: 'text-gray-500 hover:text-orange-600 hover:bg-orange-50'
		}`

	return (
		<nav className="bg-white/80 backdrop-blur-xl border-b border-orange-100 shadow-sm">
			<div className="max-w-7xl mx-auto px-4 py-3 sm:py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
				<div className="flex items-center gap-3 sm:gap-5">
					<Link href="/admin" className="flex items-center gap-3 shrink-0">
						<img src="/logo.png" alt="Leader Trans Team" className="w-8 h-8 sm:w-10 sm:h-10 object-contain" />
						<div>
							<h1 className="text-lg sm:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-600 mb-2">
								{t('adminNavTitle')}
							</h1>
							<p className="text-xs text-orange-600/70 font-semibold hidden sm:block">{t('adminNavSubtitle')}</p>
						</div>
					</Link>
					<div className="flex items-center gap-1 sm:gap-2 ml-1">
						<Link href="/admin" className={navLinkCls(!isFolders)}>
							{t('cargosTitle')}
						</Link>
						<Link href="/admin/folders" className={navLinkCls(isFolders)}>
							{t('foldersNavLink')}
						</Link>
					</div>
				</div>
				<div className="flex gap-2 sm:gap-3 w-full sm:w-auto items-center">
					<LangSwitcher />
					<a
						href="/"
						className="flex-1 sm:flex-none bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 sm:px-6 py-2 rounded-lg hover:shadow-lg transition-all font-semibold text-xs sm:text-sm text-center">
						{t('goHome')}
					</a>
					<button
						onClick={() => {
							sessionStorage.setItem('pendingToast', JSON.stringify({ message: t('loggedOut'), type: 'success' }))
							signOut({ callbackUrl: '/login' })
						}}
						className="flex-1 sm:flex-none bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 sm:px-6 py-2 rounded-lg transition-all font-semibold text-xs sm:text-sm">
						{t('logout')}
					</button>
				</div>
			</div>
		</nav>
	)
}
