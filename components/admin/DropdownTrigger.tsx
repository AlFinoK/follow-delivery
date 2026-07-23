import { ChevronDown } from 'lucide-react'

export function DropdownTrigger({
	open,
	onClick,
	children,
	invalid = false,
}: {
	open: boolean
	onClick: () => void
	children: React.ReactNode
	invalid?: boolean
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm font-medium transition-all cursor-pointer text-left ${
				open
					? 'bg-white dark:bg-zinc-900 border-orange-500 ring-2 ring-orange-500/15'
					: invalid
						? 'bg-white dark:bg-zinc-900 border-red-400 hover:border-red-500'
						: 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-600'
			}`}>
			{children}
			<ChevronDown
				className={`w-4 h-4 shrink-0 text-slate-400 dark:text-zinc-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
			/>
		</button>
	)
}
