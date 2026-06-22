'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Folder, ChevronRight, FolderOpen } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { ToastItem } from '@/components/Toast'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { PageLoader } from '@/components/PageLoader'
import { Spinner } from '@/components/Spinner'
import type { Toast } from '@/components/Toast'

interface FolderItem {
	id: string
	name: string
	cargoCount: number
	createdAt: string
	updatedAt: string
}

export default function FoldersPage() {
	const { t, tf } = useLang()
	const router = useRouter()
	const [mounted, setMounted] = useState(false)
	const [minLoadDone, setMinLoadDone] = useState(false)
	const [folders, setFolders] = useState<FolderItem[]>([])
	const [loading, setLoading] = useState(true)
	const [creating, setCreating] = useState(false)
	const [newName, setNewName] = useState('')
	const [showCreate, setShowCreate] = useState(false)
	const [toasts, setToasts] = useState<Toast[]>([])

	const addToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
		const tid = Date.now().toString()
		setToasts((prev) => [...prev, { id: tid, message, type }])
		setTimeout(() => {
			setToasts((prev) => prev.map((x) => (x.id === tid ? { ...x, exiting: true } : x)))
			setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== tid)), 350)
		}, 5000)
	}, [])

	const loadFolders = useCallback(async () => {
		setLoading(true)
		try {
			const res = await fetch('/api/folders')
			if (!res.ok) throw new Error()
			setFolders(await res.json())
		} catch {
			addToast(t('loadError'), 'error')
		} finally {
			setLoading(false)
		}
	}, [addToast, t])

	useEffect(() => {
		setMounted(true)
		loadFolders()
		const timer = setTimeout(() => setMinLoadDone(true), 444)
		return () => clearTimeout(timer)
	}, [loadFolders])

	useEffect(() => {
		const pending = sessionStorage.getItem('pendingToast')
		if (pending) {
			try {
				const { message, type } = JSON.parse(pending)
				addToast(message, type)
			} catch {}
			sessionStorage.removeItem('pendingToast')
		}
	}, [addToast])

	const handleCreate = async (e: React.FormEvent) => {
		e.preventDefault()
		const name = newName.trim()
		if (!name) { addToast(t('folderNameEmpty'), 'error'); return }
		setCreating(true)
		try {
			const res = await fetch('/api/folders', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name }),
			})
			if (!res.ok) throw new Error()
			const created: FolderItem = await res.json()
			setFolders((prev) => [created, ...prev])
			setNewName('')
			setShowCreate(false)
			addToast(t('folderCreated'), 'success')
		} catch {
			addToast(t('folderCreateError'), 'error')
		} finally {
			setCreating(false)
		}
	}

	if (!mounted) return <div suppressHydrationWarning />
	if (!minLoadDone || loading) return <PageLoader />

	return (
		<div className="min-h-screen bg-slate-50" suppressHydrationWarning>
			<AdminSidebar />

			<div className="lg:ml-64 min-h-screen flex flex-col">
				<div className="fixed top-20 lg:top-4 right-4 z-50 flex flex-col gap-2 max-w-xs">
					{toasts.map((toast) => (
						<ToastItem key={toast.id} toast={toast} />
					))}
				</div>

				<main className="flex-1 p-4 sm:p-6 pb-12">
				<div className="max-w-4xl mx-auto">
					<div className="bg-white rounded-xl shadow-sm p-5 sm:p-6 border border-slate-200">
						{/* Header */}
						<div className="flex items-center justify-between gap-3 mb-4">
							<div>
								<h2 className="text-lg font-semibold text-slate-900">{t('foldersTitle')}</h2>
								<p className="text-slate-500 text-xs mt-0.5">{tf('totalCount', { total: folders.length })}</p>
							</div>
							<button
								onClick={() => setShowCreate((v) => !v)}
								className="inline-flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-lg font-semibold text-sm transition-colors shrink-0">
								<Plus className="w-4 h-4" />
								<span className="hidden sm:inline">{t('newFolderButton')}</span>
							</button>
						</div>

						{/* Create form */}
						{showCreate && (
							<form onSubmit={handleCreate} className="mb-5 p-4 bg-slate-50 border border-slate-200 rounded-lg">
								<p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">{t('newFolderTitle')}</p>
								<div className="flex flex-col sm:flex-row gap-2">
									<input
										type="text"
										value={newName}
										onChange={(e) => setNewName(e.target.value)}
										placeholder={t('folderNamePlaceholder')}
										autoFocus
										className="flex-1 min-w-0 px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all text-sm font-medium"
									/>
									<div className="flex gap-2">
										<button
											type="submit"
											disabled={creating || !newName.trim()}
											className="flex-1 sm:flex-initial inline-flex items-center justify-center px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg disabled:opacity-50 transition-colors text-sm">
											{creating ? <Spinner className="w-4 h-4 text-white" /> : t('saveFolderName')}
										</button>
										<button
											type="button"
											onClick={() => { setShowCreate(false); setNewName('') }}
											className="flex-1 sm:flex-initial px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg transition-colors text-sm">
											{t('cancelButton')}
										</button>
									</div>
								</div>
							</form>
						)}

						{/* List */}
						{folders.length === 0 ? (
							<div className="text-center py-12">
								<Folder className="w-10 h-10 text-slate-300 mx-auto mb-3" />
								<p className="text-slate-600 font-medium text-sm">{t('noFolders')}</p>
								<p className="text-slate-400 text-xs mt-1">{t('createFirstFolder')}</p>
							</div>
						) : (
							<div className="space-y-2">
								{folders.map((f) => (
									<button
										key={f.id}
										onClick={() => router.push(`/admin/folders/${f.id}`)}
										className="w-full text-left bg-white rounded-lg p-3.5 border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all group cursor-pointer">
										<div className="flex items-center justify-between gap-3">
											<div className="flex items-center gap-3 min-w-0 flex-1">
												<FolderOpen className="w-5 h-5 text-orange-500 shrink-0" />
												<div className="min-w-0 flex-1">
													<p className="font-semibold text-slate-900 text-sm truncate group-hover:text-orange-600 transition-colors">{f.name}</p>
													<p className="text-xs text-slate-500 mt-0.5">{tf('foldersCount', { count: f.cargoCount })}</p>
												</div>
											</div>
											<ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
										</div>
									</button>
								))}
							</div>
						)}
					</div>

				</div>
			</main>
			<footer className="text-center text-slate-400 text-xs py-4 px-4">{t('adminFooter')}</footer>
			</div>
		</div>
	)
}
