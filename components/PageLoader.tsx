import { Loader2 } from 'lucide-react'

export function PageLoader() {
	return (
		<div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-50">
			<img src="/logo.png" alt="Leader Trans Team" className="w-20 h-20 object-contain mb-6 opacity-90" />
			<Loader2 className="w-7 h-7 text-orange-500 animate-spin" />
		</div>
	)
}
