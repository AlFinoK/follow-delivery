// Заглушка строки списка грузов: та же сетка и высота строк, что у CargoListCard,
// чтобы при подгрузке список не прыгал.
export function CargoSkeleton() {
	return (
		<div className="bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 sm:px-3.5 border border-slate-200 dark:border-zinc-700 animate-pulse">
			<div className="flex items-start gap-3">
				<div className="flex-1 min-w-0">
					{/* 1: номер + название · статус (sm+) */}
					<div className="flex items-center gap-2 h-5">
						<div className="h-3 bg-slate-200 dark:bg-zinc-700 rounded w-40 max-w-[60%]" />
						<div className="hidden sm:block ml-auto h-4 w-20 bg-slate-100 dark:bg-zinc-800 rounded-md" />
					</div>
					{/* 2: маршрут · дата */}
					<div className="mt-0.5 flex items-center gap-2 h-4">
						<div className="h-2.5 bg-slate-100 dark:bg-zinc-800 rounded w-36 max-w-[55%]" />
						<div className="h-2.5 bg-slate-100 dark:bg-zinc-800 rounded w-16" />
					</div>
					{/* 3 (мобила): статус · трек */}
					<div className="sm:hidden mt-1 flex items-center gap-1.5 h-5">
						<div className="h-4 w-16 bg-slate-100 dark:bg-zinc-800 rounded-md" />
						<div className="h-2 w-24 bg-slate-100 dark:bg-zinc-800 rounded" />
					</div>
				</div>
				{/* Справа: сумма + оплата */}
				<div className="shrink-0 flex flex-col items-end gap-0.5">
					<div className="h-5 flex items-center"><div className="h-3 w-16 bg-slate-200 dark:bg-zinc-700 rounded" /></div>
					<div className="h-[18px] w-14 bg-slate-100 dark:bg-zinc-800 rounded" />
				</div>
			</div>
		</div>
	)
}
