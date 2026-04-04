export function PageLoader() {
	return (
		<div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
			<img src="/logo.png" alt="Leader Trans Team" className="w-28 h-28 object-contain mb-8 drop-shadow-sm" />
			<div className="relative w-10 h-10">
				<div className="absolute inset-0 rounded-full border-4 border-orange-100" />
				<div className="absolute inset-0 rounded-full border-4 border-transparent border-t-orange-500 animate-spin" />
			</div>
		</div>
	)
}
