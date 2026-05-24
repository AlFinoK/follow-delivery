import { ChevronDown } from 'lucide-react'

export function DropdownTrigger({
	open,
	onClick,
	children,
}: {
	open: boolean
	onClick: () => void
	children: React.ReactNode
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm font-medium transition-all cursor-pointer text-left ${
				open
					? 'bg-white border-orange-500 ring-2 ring-orange-500/15'
					: 'bg-white border-slate-200 hover:border-slate-300'
			}`}>
			{children}
			<ChevronDown
				className={`w-4 h-4 shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
			/>
		</button>
	)
}
