'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, AlertCircle } from 'lucide-react'

export interface Toast {
	id: string
	message: string
	type: 'success' | 'error'
	exiting?: boolean
}

export function ToastItem({ toast }: { toast: Toast }) {
	const [visible, setVisible] = useState(false)
	useEffect(() => {
		const raf = requestAnimationFrame(() => setVisible(true))
		return () => cancelAnimationFrame(raf)
	}, [])
	const shown = visible && !toast.exiting
	const isSuccess = toast.type === 'success'
	const Icon = isSuccess ? CheckCircle2 : AlertCircle
	return (
		<div
			className={`flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg shadow-sm border text-sm font-medium transition-all duration-200 ease-out bg-white ${
				shown ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
			} ${isSuccess ? 'border-emerald-200 text-emerald-700' : 'border-red-200 text-red-700'}`}>
			<Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isSuccess ? 'text-emerald-500' : 'text-red-500'}`} />
			<span className="leading-snug">{toast.message}</span>
		</div>
	)
}
