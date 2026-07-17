'use client'

import { FlaskConical } from 'lucide-react'

// Постоянная плашка-напоминание, что это песочница (видна на всех /demo-страницах).
export function DemoRibbon() {
	return (
		<div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[60] pointer-events-none px-3">
			<div className="flex items-center gap-2 bg-amber-500 text-white text-xs font-semibold px-3.5 py-1.5 rounded-full shadow-lg">
				<FlaskConical className="w-3.5 h-3.5 shrink-0" />
				<span>Демо-режим — данные не сохраняются в базу</span>
			</div>
		</div>
	)
}
