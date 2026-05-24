'use client'

import { memo, useState, useRef, useEffect } from 'react'
import { Check } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { DropdownTrigger } from './DropdownTrigger'

const CHECK = <Check className="w-4 h-4 text-orange-500 shrink-0" />

export const TimeframeInput = memo(function TimeframeInput({
	value,
	onChange,
	className,
}: {
	value: string
	onChange: (v: string) => void
	className?: string
}) {
	const { t } = useLang()
	const [open, setOpen] = useState(false)
	const [rect, setRect] = useState<DOMRect | null>(null)
	const [localUnit, setLocalUnit] = useState('days')
	const triggerRef = useRef<HTMLDivElement>(null)
	const dropRef = useRef<HTMLDivElement>(null)

	const numStr = value ? value.split('|')[0] || '' : ''
	const safeUnit = value ? value.split('|')[1] || localUnit : localUnit

	const units = [
		{ value: 'days', label: t('unitDays') },
		{ value: 'weeks', label: t('unitWeeks') },
		{ value: 'months', label: t('unitMonths') },
	]
	const selectedUnit = units.find((u) => u.value === safeUnit) || units[0]

	const emit = (n: string, u: string) => onChange(n ? `${n}|${u}` : '')

	const toggle = () => {
		if (!open && triggerRef.current) {
			setRect(triggerRef.current.getBoundingClientRect())
		}
		setOpen((v) => !v)
	}

	useEffect(() => {
		if (!open) return
		const handler = (e: MouseEvent) => {
			if (
				triggerRef.current &&
				!triggerRef.current.contains(e.target as Node) &&
				dropRef.current &&
				!dropRef.current.contains(e.target as Node)
			) {
				setOpen(false)
			}
		}
		document.addEventListener('mousedown', handler)
		return () => document.removeEventListener('mousedown', handler)
	}, [open])

	const dropdownWidth = rect ? rect.width : 120
	const spaceBelow = rect ? window.innerHeight - rect.bottom : 999
	const upward = spaceBelow < 130

	return (
		<div className={`flex gap-2 ${className ?? ''}`}>
			<input
				type="number"
				min="1"
				value={numStr}
				onChange={(e) => emit(e.target.value, safeUnit)}
				placeholder="1"
				className="flex-1 min-w-0 px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all text-sm font-medium"
			/>
			<div ref={triggerRef} className="flex-1 min-w-0 relative">
				<DropdownTrigger open={open} onClick={toggle}>
					<span className="text-slate-900 truncate">{selectedUnit.label}</span>
				</DropdownTrigger>

				{open && rect && (
					<div
						ref={dropRef}
						style={{
							position: 'fixed',
							top: upward ? undefined : rect.bottom + 4,
							bottom: upward ? window.innerHeight - rect.top + 4 : undefined,
							left: rect.left,
							width: dropdownWidth,
							zIndex: 9999,
						}}
						className="bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
						{units.map((opt) => (
							<button
								key={opt.value}
								type="button"
								onClick={() => {
									setLocalUnit(opt.value)
									emit(numStr, opt.value)
									setOpen(false)
								}}
								className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between ${
									safeUnit === opt.value
										? 'bg-orange-50 text-orange-700 font-semibold'
										: 'text-slate-700 hover:bg-slate-50'
								}`}>
								{opt.label}
								{safeUnit === opt.value && CHECK}
							</button>
						))}
					</div>
				)}
			</div>
		</div>
	)
})
