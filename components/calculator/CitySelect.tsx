'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { MapPin, ChevronDown, Search, X, AlertTriangle } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { DIRECTIONS, type Direction } from '@/lib/calculator/config'
import { isExcluded } from '@/lib/calculator/engine'

export interface CitySelection {
	code: string // код терминала-направления из справочника
	name: string
}

interface CitySelectProps {
	value: CitySelection | null
	onChange: (sel: CitySelection | null) => void
}

const normalize = (s: string) => s.trim().toLowerCase().replace(/ё/g, 'е')

export function CitySelect({ value, onChange }: CitySelectProps) {
	const { t } = useLang()
	const [open, setOpen] = useState(false)
	const [query, setQuery] = useState('')
	const boxRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const onDoc = (e: MouseEvent) => {
			if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
		}
		document.addEventListener('mousedown', onDoc)
		return () => document.removeEventListener('mousedown', onDoc)
	}, [])

	const filtered = useMemo(() => {
		const q = normalize(query)
		if (!q) return DIRECTIONS
		return DIRECTIONS.filter((d) => normalize(d.name).includes(q) || normalize(d.region).includes(q))
	}, [query])

	const trimmed = query.trim()
	const customExcluded = trimmed.length >= 2 && isExcluded(trimmed)

	const selectDirection = (d: Direction) => {
		onChange({ code: d.code, name: d.name })
		setQuery('')
		setOpen(false)
	}
	const clear = () => {
		onChange(null)
		setQuery('')
		setOpen(true)
	}

	return (
		<div ref={boxRef} className="relative">
			<label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
				{t('calcDestLabel')}
			</label>

			{value ? (
				<button
					type="button"
					onClick={() => setOpen((o) => !o)}
					className="w-full flex items-center gap-2.5 pl-3 pr-2 py-2.5 bg-white border border-slate-200 rounded-lg text-left hover:border-slate-300 transition-colors">
					<MapPin className="w-4 h-4 text-orange-500 shrink-0" />
					<span className="flex-1 text-sm font-medium text-slate-900 truncate">{value.name}</span>
					<span
						role="button"
						tabIndex={0}
						onClick={(e) => {
							e.stopPropagation()
							clear()
						}}
						className="p-1 text-slate-400 hover:text-slate-600 rounded">
						<X className="w-4 h-4" />
					</span>
				</button>
			) : (
				<div className="relative">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
					<input
						type="text"
						value={query}
						onChange={(e) => {
							setQuery(e.target.value)
							setOpen(true)
						}}
						onFocus={() => setOpen(true)}
						placeholder={t('calcDestSearch')}
						className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all text-sm"
					/>
					<ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
				</div>
			)}

			{open && !value && (
				<div className="absolute z-30 mt-1.5 w-full max-h-72 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg py-1">
					{customExcluded && (
						<div className="flex items-start gap-2 px-3 py-2 text-xs text-red-600">
							<AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
							<span>{t('calcExcludedDesc')}</span>
						</div>
					)}
					{filtered.map((d) => (
						<button
							key={d.code}
							type="button"
							onClick={() => selectDirection(d)}
							className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50 transition-colors">
							<MapPin className="w-3.5 h-3.5 text-slate-300 shrink-0" />
							<span className="min-w-0 flex-1">
								<span className="block text-sm text-slate-700 truncate">{d.name}</span>
								{d.region && d.region !== d.name && (
									<span className="block text-[11px] text-slate-400 truncate">{d.region}</span>
								)}
							</span>
						</button>
					))}
					{filtered.length === 0 && !customExcluded && (
						<p className="px-3 py-3 text-sm text-slate-400 text-center">{t('calcNoResults')}</p>
					)}
				</div>
			)}
		</div>
	)
}
