'use client'

import { Check, X } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'

export function EditActions({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
	const { t } = useLang()
	return (
		<div className="flex gap-2 mt-2">
			<button
				onClick={onSave}
				className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-semibold transition-colors">
				<Check className="w-3.5 h-3.5" />
				{t('saveButton')}
			</button>
			<button
				onClick={onCancel}
				className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors">
				<X className="w-3.5 h-3.5" />
			</button>
		</div>
	)
}
