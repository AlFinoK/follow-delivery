'use client'

import { Trash2 } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'

interface DeleteModalProps {
	isOpen: boolean
	itemName?: string | null
	itemId?: string | null
	onConfirm: () => void
	onCancel: () => void
}

export function DeleteModal({ isOpen, itemName, itemId, onConfirm, onCancel }: DeleteModalProps) {
	const { t } = useLang()

	if (!isOpen) return null

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4"
			onClick={onCancel}>
			<div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
			<div
				className="relative bg-white dark:bg-zinc-900 rounded-xl shadow-xl w-full max-w-sm p-6 border border-slate-200 dark:border-zinc-700"
				onClick={(e) => e.stopPropagation()}>
				<div className="flex items-center justify-center w-10 h-10 mx-auto mb-4 rounded-full bg-red-50 dark:bg-red-500/15">
					<Trash2 className="w-5 h-5 text-red-600 dark:text-red-300" />
				</div>

				<h3 className="text-base font-semibold text-slate-900 dark:text-zinc-100 text-center mb-1">{t('deleteButton')}</h3>
				<p className="text-sm text-slate-500 dark:text-zinc-400 text-center mb-5">{t('confirmDelete')}</p>

				{(itemName || itemId) && (
					<div className="bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-700 rounded-lg px-3 py-2.5 mb-5 text-center">
						{itemName && <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100 truncate">{itemName}</p>}
						{itemId && <p className="text-xs font-mono text-slate-400 dark:text-zinc-500 mt-0.5 truncate">{itemId}</p>}
					</div>
				)}

				<div className="flex gap-2">
					<button
						onClick={onCancel}
						className="flex-1 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-zinc-200 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800/60 rounded-lg transition-colors">
						{t('cancelButton')}
					</button>
					<button
						onClick={onConfirm}
						className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors">
						{t('deleteButton')}
					</button>
				</div>
			</div>
		</div>
	)
}
