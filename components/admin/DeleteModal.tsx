'use client'

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
			<div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
			<div
				className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-red-100"
				onClick={(e) => e.stopPropagation()}>
				{/* Icon */}

				<h3 className="text-lg font-black text-gray-900 text-center mb-1">{t('deleteButton')}</h3>
				<p className="text-sm text-gray-500 text-center mb-5">{t('confirmDelete')}</p>

				{(itemName || itemId) && (
					<div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-6 text-center">
						{itemName && <p className="text-sm font-bold text-gray-900 truncate">{itemName}</p>}
						{itemId && <p className="text-xs font-mono text-gray-400 mt-0.5 truncate">{itemId}</p>}
					</div>
				)}

				<div className="flex gap-3">
					<button
						onClick={onCancel}
						className="flex-1 px-4 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
						{t('cancelButton')}
					</button>
					<button
						onClick={onConfirm}
						className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors shadow-sm shadow-red-200">
						{t('deleteButton')}
					</button>
				</div>
			</div>
		</div>
	)
}
