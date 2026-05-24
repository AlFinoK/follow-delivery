export function CargoSkeleton() {
	return (
		<div className="bg-white rounded-lg p-4 border border-slate-200 animate-pulse">
			<div className="flex items-start justify-between gap-3 mb-3">
				<div className="flex-1 space-y-1.5">
					<div className="h-3 bg-slate-200 rounded w-32" />
					<div className="h-2.5 bg-slate-100 rounded w-44" />
				</div>
				<div className="h-5 w-16 bg-slate-100 rounded-full" />
			</div>
			<div className="flex items-center gap-2 text-xs">
				<div className="h-2.5 bg-slate-100 rounded w-20" />
				<div className="h-2.5 bg-slate-100 rounded w-20" />
				<div className="h-2.5 bg-slate-100 rounded w-20" />
			</div>
		</div>
	)
}
