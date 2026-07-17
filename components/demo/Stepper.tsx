'use client'

import { Fragment } from 'react'
import { Check } from 'lucide-react'

// Индикатор шагов визарда. Пройденные шаги — с галочкой и кликабельны (возврат назад).
export function Stepper({
	steps,
	current,
	maxReached,
	onStep,
}: {
	steps: string[]
	current: number
	maxReached: number
	onStep: (i: number) => void
}) {
	return (
		<div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 -mx-1 px-1">
			{steps.map((label, i) => {
				const done = i < current
				const active = i === current
				const clickable = i <= maxReached
				return (
					<Fragment key={label}>
						<button
							type="button"
							disabled={!clickable}
							onClick={() => clickable && onStep(i)}
							className={`group flex items-center gap-2 shrink-0 rounded-lg px-1 ${clickable && !active ? 'cursor-pointer' : 'cursor-default'}`}>
							<span
								className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${
									active
										? 'bg-orange-500 border-orange-500 text-white'
										: done
											? 'bg-orange-50 border-orange-500 text-orange-600 group-hover:bg-orange-100'
											: 'bg-white border-slate-200 text-slate-400'
								}`}>
								{done ? <Check className="w-4 h-4" /> : i + 1}
							</span>
							<span
								className={`text-sm font-medium whitespace-nowrap hidden md:inline ${
									active ? 'text-slate-900' : done ? 'text-slate-600 group-hover:text-slate-900' : 'text-slate-400'
								}`}>
								{label}
							</span>
						</button>
						{i < steps.length - 1 && (
							<span className={`h-0.5 w-4 sm:w-8 shrink-0 rounded ${i < current ? 'bg-orange-400' : 'bg-slate-200'}`} />
						)}
					</Fragment>
				)
			})}
		</div>
	)
}
