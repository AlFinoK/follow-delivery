'use client'

import { useLang } from '@/contexts/LangContext'

interface ConfirmModalProps {
	isOpen: boolean
	title: string
	description?: string
	confirmLabel?: string
	cancelLabel?: string
	tone?: 'default' | 'danger'
	onConfirm: () => void
	onCancel: () => void
}

export function ConfirmModal({
	isOpen,
	title,
	description,
	confirmLabel,
	cancelLabel,
	tone = 'default',
	onConfirm,
	onCancel,
}: ConfirmModalProps) {
	const { t } = useLang()
	if (!isOpen) return null

	const confirmCls =
		tone === 'danger'
			? 'bg-red-600 hover:bg-red-700'
			: 'bg-orange-500 hover:bg-orange-600'

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onCancel}>
			<div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
			<div
				className="relative bg-white dark:bg-zinc-900 rounded-xl shadow-xl w-full max-w-sm p-6 border border-slate-200 dark:border-zinc-700"
				onClick={(e) => e.stopPropagation()}>
				<h3 className="text-base font-semibold text-slate-900 dark:text-zinc-100 mb-1">{title}</h3>
				{description && <p className="text-sm text-slate-500 dark:text-zinc-400 mb-5">{description}</p>}
				<div className="flex gap-2">
					<button
						onClick={onCancel}
						className="flex-1 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-zinc-200 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800/60 rounded-lg transition-colors">
						{cancelLabel ?? t('cancelButton')}
					</button>
					<button
						onClick={onConfirm}
						className={`flex-1 px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors ${confirmCls}`}>
						{confirmLabel ?? t('saveButton')}
					</button>
				</div>
			</div>
		</div>
	)
}
