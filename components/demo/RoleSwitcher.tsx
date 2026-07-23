'use client'

import { UserCog, ChevronDown, Check } from 'lucide-react'
import { useDropdown } from '@/components/admin/useDropdown'
import { ROLE_LABELS, type Role } from '@/lib/demo/waybill'

// Демо-переключатель ролей (§1.3). Кастомный дропдаун (не нативный select),
// чтобы список рисовался в стиле проекта. В проде роль берётся из сессии.
export function RoleSwitcher({ role, onChange }: { role: Role; onChange: (r: Role) => void }) {
	const { open, upward, toggle, setOpen, ref } = useDropdown(160)
	const roles = Object.keys(ROLE_LABELS) as Role[]

	return (
		<div ref={ref} className="relative">
			<button
				type="button"
				onClick={toggle}
				className={`inline-flex items-center gap-2 bg-white dark:bg-zinc-900 border rounded-lg px-3 py-2 shadow-sm text-sm transition-all ${
					open ? 'border-orange-500 ring-2 ring-orange-500/15' : 'border-slate-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-600'
				}`}>
				<UserCog className="w-4 h-4 text-orange-500 shrink-0" />
				<span className="text-xs font-medium text-slate-500 dark:text-zinc-400 hidden sm:inline">Роль:</span>
				<span className="font-medium text-slate-900 dark:text-zinc-100">{ROLE_LABELS[role]}</span>
				<ChevronDown className={`w-4 h-4 text-slate-400 dark:text-zinc-500 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
			</button>
			{open && (
				<div
					className={`absolute ${upward ? 'bottom-full mb-1' : 'top-full mt-1'} right-0 min-w-[190px] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg shadow-lg z-50 overflow-hidden`}>
					{roles.map((r) => (
						<button
							key={r}
							type="button"
							onClick={() => {
								onChange(r)
								setOpen(false)
							}}
							className={`w-full text-left px-3.5 py-2 text-sm transition-colors flex items-center justify-between gap-2 ${
								r === role ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-300 font-semibold' : 'text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800/60'
							}`}>
							{ROLE_LABELS[r]}
							{r === role && <Check className="w-4 h-4 text-orange-500 shrink-0" />}
						</button>
					))}
				</div>
			)}
		</div>
	)
}
