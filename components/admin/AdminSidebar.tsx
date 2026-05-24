'use client'

import { useState, useEffect } from 'react'
import { signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut, Home, Package, Folder, Menu, X } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { LangSwitcher } from '@/components/LangSwitcher'

function SidebarBody({ onLinkClick }: { onLinkClick?: () => void }) {
	const { t } = useLang()
	const pathname = usePathname()
	const isFolders = pathname.startsWith('/admin/folders')

	const linkCls = (active: boolean) =>
		`inline-flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
			active
				? 'bg-orange-50 text-orange-700'
				: 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
		}`

	const handleLogout = () => {
		sessionStorage.setItem('pendingToast', JSON.stringify({ message: t('loggedOut'), type: 'success' }))
		signOut({ callbackUrl: '/login' })
	}

	return (
		<div className="flex flex-col h-full">
			{/* Brand */}
			<Link
				href="/admin"
				onClick={onLinkClick}
				className="flex items-center gap-2.5 px-5 py-5 border-b border-slate-200">
				<img src="/logo.png" alt="Leader Trans Team" className="w-9 h-9 object-contain" />
				<div className="leading-tight min-w-0">
					<p className="text-sm font-semibold text-slate-900 truncate">Leader Trans Team</p>
					<p className="text-[11px] text-slate-500">{t('adminNavSubtitle')}</p>
				</div>
			</Link>

			{/* Primary nav */}
			<nav className="flex-1 px-3 py-4 flex flex-col gap-1">
				<Link href="/admin" onClick={onLinkClick} className={linkCls(!isFolders)}>
					<Package className="w-4 h-4" />
					<span>{t('cargosTitle')}</span>
				</Link>
				<Link href="/admin/folders" onClick={onLinkClick} className={linkCls(isFolders)}>
					<Folder className="w-4 h-4" />
					<span>{t('foldersNavLink')}</span>
				</Link>
			</nav>

			{/* Footer area */}
			<div className="border-t border-slate-200 px-3 py-3 flex flex-col gap-1">
				<div className="px-1 pb-2">
					<LangSwitcher />
				</div>
				<a
					href="/"
					className="inline-flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors">
					<Home className="w-4 h-4" />
					<span>{t('goHome')}</span>
				</a>
				<button
					onClick={handleLogout}
					className="inline-flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors text-left">
					<LogOut className="w-4 h-4" />
					<span>{t('logout')}</span>
				</button>
			</div>
		</div>
	)
}

export function AdminSidebar() {
	const [drawerOpen, setDrawerOpen] = useState(false)
	const pathname = usePathname()

	// Close drawer on route change
	useEffect(() => { setDrawerOpen(false) }, [pathname])

	// Lock body scroll while drawer is open
	useEffect(() => {
		if (drawerOpen) {
			const prev = document.body.style.overflow
			document.body.style.overflow = 'hidden'
			return () => { document.body.style.overflow = prev }
		}
	}, [drawerOpen])

	return (
		<>
			{/* Desktop sidebar */}
			<aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200 flex-col z-30">
				<SidebarBody />
			</aside>

			{/* Mobile topbar */}
			<header className="lg:hidden sticky top-0 z-40 bg-white border-b border-slate-200">
				<div className="flex items-center justify-between px-3 py-2.5">
					<button
						onClick={() => setDrawerOpen(true)}
						className="p-2 -ml-1 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
						aria-label="Открыть меню">
						<Menu className="w-5 h-5" />
					</button>
					<Link href="/admin" className="flex items-center gap-2">
						<img src="/logo.png" alt="Leader Trans Team" className="w-7 h-7 object-contain" />
						<span className="text-sm font-semibold text-slate-900">Leader Trans Team</span>
					</Link>
					<div className="w-9" />
				</div>
			</header>

			{/* Mobile drawer */}
			{drawerOpen && (
				<div className="lg:hidden fixed inset-0 z-50 flex">
					<div
						className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
						onClick={() => setDrawerOpen(false)}
					/>
					<aside className="relative bg-white w-72 max-w-[85%] flex flex-col border-r border-slate-200 shadow-xl">
						<button
							onClick={() => setDrawerOpen(false)}
							className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
							aria-label="Закрыть меню">
							<X className="w-5 h-5" />
						</button>
						<SidebarBody onLinkClick={() => setDrawerOpen(false)} />
					</aside>
				</div>
			)}
		</>
	)
}
