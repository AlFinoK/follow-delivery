'use client'

import { useLang } from '@/contexts/LangContext'

export function EditActions({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
	const { t } = useLang()
	return (
		<div className="flex gap-2 mt-1">
			<button
				onClick={onSave}
				className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all">
				{t('saveButton')}
			</button>
			<button
				onClick={onCancel}
				className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs font-bold transition-all">
				✕
			</button>
		</div>
	)
}
