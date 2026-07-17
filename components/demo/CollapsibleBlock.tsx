'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

// Независимо сворачиваемый блок страницы (§1.4).
export function CollapsibleBlock({
	badge,
	title,
	subtitle,
	defaultOpen = true,
	right,
	children,
}: {
	badge: string
	title: string
	subtitle?: string
	defaultOpen?: boolean
	right?: React.ReactNode
	children: React.ReactNode
}) {
	const [open, setOpen] = useState(defaultOpen)
	return (
		<section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
			<div className="flex items-center gap-3 p-4 sm:p-5 border-b border-slate-100">
				<span className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white font-bold flex items-center justify-center text-sm">
					{badge}
				</span>
				<button
					type="button"
					onClick={() => setOpen((v) => !v)}
					className="flex-1 flex items-center gap-2 text-left min-w-0">
					<span className="min-w-0">
						<span className="block font-semibold text-slate-900 truncate">{title}</span>
						{subtitle && <span className="block text-xs text-slate-500 truncate">{subtitle}</span>}
					</span>
					<ChevronDown
						className={`w-5 h-5 text-slate-400 shrink-0 ml-auto transition-transform ${open ? 'rotate-180' : ''}`}
					/>
				</button>
				{right && <div className="shrink-0">{right}</div>}
			</div>
			{open && <div className="p-4 sm:p-5">{children}</div>}
		</section>
	)
}
