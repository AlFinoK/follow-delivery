'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/contexts/LangContext'
import { ToastItem } from '@/components/Toast'
import { AdminNav } from '@/components/admin/AdminNav'
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
		<div
			className="min-h-screen flex flex-col bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50"
			suppressHydrationWarning>
			<div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-xs">
				{toasts.map((toast) => (
					<ToastItem key={toast.id} toast={toast} />
				))}
			</div>

			<AdminNav />

			<main className="flex-1 p-4 sm:p-6 pb-12">
				<div className="max-w-4xl mx-auto">
					<div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 border border-orange-100">
						{/* Header */}
						<div className="flex items-center gap-3 mb-5">
							<span className="text-2xl sm:text-3xl">🗂️</span>
							<div className="flex-1">
								<h2 className="text-xl sm:text-2xl font-black text-gray-900">{t('foldersTitle')}</h2>
								<p className="text-orange-600 text-xs sm:text-sm">{tf('totalCount', { total: folders.length })}</p>
							</div>
							<button
								onClick={() => setShowCreate((v) => !v)}
								className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-xl font-bold text-sm hover:shadow-lg transition-all flex-shrink-0">
								<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
									<path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
								</svg>
								<span className="hidden sm:inline">{t('newFolderButton').replace('➕ ', '')}</span>
							</button>
						</div>

						{/* Create form */}
						{showCreate && (
							<form onSubmit={handleCreate} className="mb-5 p-4 bg-orange-50 border border-orange-100 rounded-xl">
								<p className="text-xs font-bold text-orange-600 uppercase tracking-widest mb-2">{t('newFolderTitle')}</p>
								<div className="flex gap-2">
									<input
										type="text"
										value={newName}
										onChange={(e) => setNewName(e.target.value)}
										placeholder={t('folderNamePlaceholder')}
										autoFocus
										className="flex-1 px-4 py-2.5 bg-white border-2 border-orange-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-400/30 transition-all text-sm font-medium"
									/>
									<button
										type="submit"
										disabled={creating || !newName.trim()}
										className="px-5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl hover:shadow-lg disabled:opacity-50 transition-all text-sm">
										{creating ? <Spinner /> : t('saveFolderName')}
									</button>
									<button
										type="button"
										onClick={() => { setShowCreate(false); setNewName('') }}
										className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors text-sm">
										{t('cancelButton')}
									</button>
								</div>
							</form>
						)}

						{/* List */}
						{folders.length === 0 ? (
							<div className="text-center py-12">
								<p className="text-4xl mb-3">📭</p>
								<p className="text-gray-500 font-semibold">{t('noFolders')}</p>
								<p className="text-gray-400 text-sm mt-1">{t('createFirstFolder')}</p>
							</div>
						) : (
							<div className="space-y-3">
								{folders.map((f) => (
									<button
										key={f.id}
										onClick={() => router.push(`/admin/folders/${f.id}`)}
										className="w-full text-left bg-white rounded-xl p-4 sm:p-5 border-2 border-orange-100 hover:border-orange-300 hover:shadow-md transition-all group cursor-pointer">
										<div className="flex items-center justify-between gap-3">
											<div className="flex items-center gap-3 min-w-0 flex-1">
												<span className="text-2xl shrink-0">🗂️</span>
												<div className="min-w-0 flex-1">
													<p className="font-bold text-gray-900 text-sm sm:text-base truncate group-hover:text-orange-600 transition-colors">{f.name}</p>
													<p className="text-xs text-gray-500 mt-0.5">{tf('foldersCount', { count: f.cargoCount })}</p>
												</div>
											</div>
											<span className="shrink-0 text-orange-400 text-xl">›</span>
										</div>
									</button>
								))}
							</div>
						)}
					</div>

					<div className="mt-8 text-center text-gray-500 text-xs sm:text-sm">
						<p>{t('adminFooter')}</p>
					</div>
				</div>
			</main>
		</div>
	)
}
