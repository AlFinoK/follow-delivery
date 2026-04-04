const CHEVRON = (
	<svg viewBox="0 0 20 20" fill="currentColor">
		<path
			fillRule="evenodd"
			d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
			clipRule="evenodd"
		/>
	</svg>
)

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
			className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all cursor-pointer text-left ${
				open ? 'bg-white border-orange-500 ring-2 ring-orange-400/20' : 'bg-gray-50 border-orange-200 hover:border-orange-300'
			}`}>
			{children}
			<span className={`w-4 h-4 text-orange-500 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
				{CHEVRON}
			</span>
		</button>
	)
}
