'use client'

import { signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut, Home, Package, Folder } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { LangSwitcher } from '@/components/LangSwitcher'

export function AdminNav() {
	const { t } = useLang()
	const pathname = usePathname()
	const isFolders = pathname.startsWith('/admin/folders')

	const navLinkCls = (active: boolean) =>
		`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
			active
				? 'bg-slate-100 text-slate-900'
				: 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
		}`

	return (
		<nav className="bg-white border-b border-slate-200">
			<div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row justify-between items-center gap-3">
				<div className="flex items-center gap-3 sm:gap-6">
					<Link href="/admin" className="flex items-center gap-2.5 shrink-0">
						<img src="/logo.png" alt="Leader Trans Team" className="w-8 h-8 object-contain" />
						<div className="leading-tight">
							<p className="text-sm font-semibold text-slate-900">Leader Trans Team</p>
							<p className="text-[11px] text-slate-500 hidden sm:block">{t('adminNavSubtitle')}</p>
						</div>
					</Link>
					<div className="flex items-center gap-1">
						<Link href="/admin" className={navLinkCls(!isFolders)}>
							<Package className="w-4 h-4" />
							<span>{t('cargosTitle')}</span>
						</Link>
						<Link href="/admin/folders" className={navLinkCls(isFolders)}>
							<Folder className="w-4 h-4" />
							<span>{t('foldersNavLink')}</span>
						</Link>
					</div>
				</div>
				<div className="flex gap-2 items-center">
					<LangSwitcher />
					<a
						href="/"
						className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-all text-sm font-medium">
						<Home className="w-4 h-4" />
						<span className="hidden sm:inline">{t('goHome')}</span>
					</a>
					<button
						onClick={() => {
							sessionStorage.setItem('pendingToast', JSON.stringify({ message: t('loggedOut'), type: 'success' }))
							signOut({ callbackUrl: '/login' })
						}}
						className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-all text-sm font-medium">
						<LogOut className="w-4 h-4" />
						<span className="hidden sm:inline">{t('logout')}</span>
					</button>
				</div>
			</div>
		</nav>
	)
}
