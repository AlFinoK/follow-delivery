'use client'

// Кастомный селект в стиле проекта (slate + orange) — заменяет нативный <select>,
// у которого выпадающий список рисует ОС и выбивается из дизайна. Построен на том же
// useDropdown, что и админские селекты ([components/admin/Selects.tsx]).

import { Check, ChevronDown } from 'lucide-react'
import { useDropdown } from '@/components/admin/useDropdown'

export interface SelectOption<T extends string> {
	value: T
	label: string
}

export function Select<T extends string>({
	value,
	onChange,
	options,
	disabled = false,
	className = '',
	size = 'md',
}: {
	value: T
	onChange: (v: T) => void
	options: SelectOption<T>[]
	disabled?: boolean
	className?: string
	/** md — как поля формы; sm — компактный (в тулбарах) */
	size?: 'md' | 'sm'
}) {
	const { open, upward, toggle, setOpen, ref } = useDropdown(options.length * 42 + 16)
	const selected = options.find((o) => o.value === value)
	const pad = size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-3.5 py-2.5 text-sm'

	return (
		<div ref={ref} className={`relative ${className}`}>
			<button
				type="button"
				disabled={disabled}
				onClick={toggle}
				className={`w-full flex items-center justify-between gap-2 ${pad} rounded-lg border font-medium transition-all text-left disabled:opacity-60 disabled:cursor-not-allowed ${
					open ? 'bg-white dark:bg-zinc-900 border-orange-500 ring-2 ring-orange-500/15' : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-600'
				}`}>
				<span className="text-slate-900 dark:text-zinc-100 truncate">{selected?.label ?? ''}</span>
				<ChevronDown
					className={`w-4 h-4 shrink-0 text-slate-400 dark:text-zinc-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
				/>
			</button>
			{open && !disabled && (
				<div
					className={`absolute ${upward ? 'bottom-full mb-1' : 'top-full mt-1'} left-0 right-0 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg shadow-lg z-50 overflow-hidden`}>
					<div className="max-h-60 overflow-y-auto">
						{options.map((opt) => (
							<button
								key={opt.value}
								type="button"
								onClick={() => {
									onChange(opt.value)
									setOpen(false)
								}}
								className={`w-full text-left px-3.5 py-2 text-sm transition-colors flex items-center justify-between gap-2 ${
									opt.value === value
										? 'bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-300 font-semibold'
										: 'text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800/60'
								}`}>
								{opt.label}
								{opt.value === value && <Check className="w-4 h-4 text-orange-500 shrink-0" />}
							</button>
						))}
					</div>
				</div>
			)}
		</div>
	)
}
