'use client'

import { useState, useEffect } from 'react'

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
	return (
		<div
			className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold transition-all duration-300 ease-out ${
				shown ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-6'
			} ${toast.type === 'success' ? 'bg-emerald-500 border-emerald-400/50 text-white' : 'bg-red-500 border-red-400/50 text-white'}`}>
			<span className="text-base leading-none">{toast.type === 'success' ? '✓' : '✕'}</span>
			{toast.message}
		</div>
	)
}
