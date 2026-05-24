'use client'

import { memo, useState, useEffect, useRef } from 'react'
import { DayPicker } from 'react-day-picker'
import type { DropdownProps } from 'react-day-picker'
import { ru, kk as kkLocale } from 'date-fns/locale'
import { Calendar, ChevronDown, Check } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { formatDate } from '@/lib/format'

// Кастомный dropdown для month/year — заменяет нативный <select> на popover,
// чтобы выпадающий список отрисовывался нашими стилями (slate + orange), а не браузерными option.
function RdpDropdown(props: DropdownProps) {
	const [open, setOpen] = useState(false)
	const [rect, setRect] = useState<DOMRect | null>(null)
	const triggerRef = useRef<HTMLButtonElement>(null)
	const dropRef = useRef<HTMLDivElement>(null)

	const value = props.value
	const options = props.options ?? []
	const selected = options.find((o) => String(o.value) === String(value))

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
				triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
				dropRef.current && !dropRef.current.contains(e.target as Node)
			) setOpen(false)
		}
		const closeOnEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
		document.addEventListener('mousedown', handler)
		document.addEventListener('keydown', closeOnEsc)
		return () => {
			document.removeEventListener('mousedown', handler)
			document.removeEventListener('keydown', closeOnEsc)
		}
	}, [open])

	const choose = (v: number) => {
		props.onChange?.({ target: { value: String(v) } } as unknown as React.ChangeEvent<HTMLSelectElement>)
		setOpen(false)
	}

	const dropMaxHeight = 240
	const spaceBelow = rect ? window.innerHeight - rect.bottom : 999
	const upward = spaceBelow < dropMaxHeight

	return (
		<span className="relative inline-block">
			<button
				ref={triggerRef}
				type="button"
				onClick={toggle}
				className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm font-semibold text-slate-900 hover:bg-slate-100 transition-colors">
				{selected?.label ?? String(value ?? '')}
				<ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
			</button>

			{open && rect && (
				<div
					ref={dropRef}
					style={{
						position: 'fixed',
						top: upward ? undefined : rect.bottom + 4,
						bottom: upward ? window.innerHeight - rect.top + 4 : undefined,
						left: rect.left,
						minWidth: rect.width,
						maxHeight: dropMaxHeight,
						zIndex: 9999,
					}}
					className="bg-white border border-slate-200 rounded-lg shadow-lg overflow-y-auto py-1">
					{options.map((opt) => {
						const isSelected = String(opt.value) === String(value)
						return (
							<button
								key={opt.value}
								type="button"
								disabled={opt.disabled}
								onClick={() => choose(opt.value)}
								className={`w-full text-left px-3 py-1.5 text-sm transition-colors flex items-center justify-between gap-3 ${
									isSelected
										? 'bg-orange-50 text-orange-700 font-semibold'
										: opt.disabled
											? 'text-slate-300 cursor-not-allowed'
											: 'text-slate-700 hover:bg-slate-50'
								}`}>
								{opt.label}
								{isSelected && <Check className="w-3.5 h-3.5 text-orange-500 shrink-0" />}
							</button>
						)
					})}
				</div>
			)}
		</span>
	)
}

export const DatePickerField = memo(function DatePickerField({
	value,
	onChange,
	className,
}: {
	value: string
	onChange: (v: string) => void
	className?: string
}) {
	const { t, lang } = useLang()
	const [open, setOpen] = useState(false)
	const [upward, setUpward] = useState(false)
	const ref = useRef<HTMLDivElement>(null)
	const selected = value ? new Date(value + 'T12:00:00') : undefined
	const locale = lang === 'kk' ? kkLocale : ru

	const handleToggle = () => {
		if (!open && ref.current) {
			const rect = ref.current.getBoundingClientRect()
			setUpward(window.innerHeight - rect.bottom < 320)
		}
		setOpen((v) => !v)
	}

	useEffect(() => {
		if (!open) return
		const handler = (e: MouseEvent) => {
			if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
		}
		document.addEventListener('mousedown', handler)
		return () => document.removeEventListener('mousedown', handler)
	}, [open])

	return (
		<div ref={ref} className={`relative ${className ?? ''}`}>
			<button
				type="button"
				onClick={handleToggle}
				className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm font-medium transition-all cursor-pointer ${
					open
						? 'bg-white border-orange-500 ring-2 ring-orange-500/15'
						: 'bg-white border-slate-200 hover:border-slate-300'
				}`}>
				<span className={selected ? 'text-slate-900' : 'text-slate-400'}>
					{selected ? formatDate(value) : t('notSpecified')}
				</span>
				<Calendar className="w-4 h-4 text-slate-400 shrink-0" />
			</button>
			{open && (
				<div
					className={`absolute ${upward ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-2`}>
					<DayPicker
						mode="single"
						selected={selected}
						defaultMonth={selected}
						locale={locale}
						captionLayout="dropdown"
						startMonth={new Date(2020, 0)}
						endMonth={new Date(2035, 11)}
						components={{ Dropdown: RdpDropdown }}
						onSelect={(date) => {
							if (date) {
								const y = date.getFullYear()
								const m = String(date.getMonth() + 1).padStart(2, '0')
								const d = String(date.getDate()).padStart(2, '0')
								onChange(`${y}-${m}-${d}`)
								setOpen(false)
							}
						}}
						weekStartsOn={1}
					/>
				</div>
			)}
		</div>
	)
})
