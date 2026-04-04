'use client'

import { memo, useState, useEffect, useRef } from 'react'
import { DayPicker } from 'react-day-picker'
import { ru, kk as kkLocale } from 'date-fns/locale'
import 'react-day-picker/style.css'
import { useLang } from '@/contexts/LangContext'
import { formatDate } from '@/lib/format'

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
				className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all cursor-pointer ${
					open ? 'bg-white border-orange-500 ring-2 ring-orange-400/20' : 'bg-gray-50 border-orange-200 hover:border-orange-300'
				}`}>
				<span className={selected ? 'text-gray-900' : 'text-gray-400'}>{selected ? formatDate(value) : t('notSpecified')}</span>
				<span className="text-orange-400 text-base">📅</span>
			</button>
			{open && (
				<div
					className={`absolute ${upward ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 bg-white border border-orange-200 rounded-2xl shadow-xl z-50 p-2`}>
					<DayPicker
						mode="single"
						selected={selected}
						defaultMonth={selected}
						locale={locale}
						captionLayout="dropdown"
						startMonth={new Date(2020, 0)}
						endMonth={new Date(2035, 11)}
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
