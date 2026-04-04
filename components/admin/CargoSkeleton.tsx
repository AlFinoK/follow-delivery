export function CargoSkeleton() {
	return (
		<div className="bg-gray-50 rounded-xl p-5 border border-orange-100 animate-pulse">
			<div className="mb-4 pb-4 border-b border-orange-100">
				<div className="h-2.5 bg-orange-100 rounded w-20 mb-2" />
				<div className="h-10 bg-gray-200 rounded-lg" />
			</div>
			<div className="space-y-3 mb-4 pb-4 border-b border-orange-100">
				{[0, 1, 2].map((i) => (
					<div key={i} className="flex items-center gap-2">
						<div className="w-6 h-6 bg-gray-200 rounded-full flex-shrink-0" />
						<div className="flex-1 space-y-1.5">
							<div className="h-2 bg-orange-100 rounded w-16" />
							<div className="h-3 bg-gray-200 rounded w-28" />
						</div>
					</div>
				))}
			</div>
			<div className="space-y-2.5 mb-4 pb-4 border-b border-orange-100">
				{[0, 1, 2, 3].map((i) => (
					<div key={i} className="flex items-center gap-2">
						<div className="w-5 h-5 bg-gray-200 rounded flex-shrink-0" />
						<div className="flex-1 space-y-1">
							<div className="h-2 bg-orange-100 rounded w-20" />
							<div className="h-3 bg-gray-200 rounded w-24" />
						</div>
					</div>
				))}
			</div>
			<div className="h-11 bg-gray-200 rounded-xl mb-3" />
			<div className="h-9 bg-red-100 rounded-lg" />
		</div>
	)
}
