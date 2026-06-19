'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { MapPin, ChevronDown, Search, X, AlertTriangle, Building2, Home } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { DIRECTIONS, type Direction } from '@/lib/calculator/config'
import { isExcluded } from '@/lib/calculator/engine'
import { Spinner } from '@/components/Spinner'

export interface CitySelection {
	code: string // код города-терминала (база тарифа)
	name: string // отображаемое название
	approx?: boolean // НП вне списка терминалов — тариф по ближайшему городу
	surcharge?: number // доля региональной надбавки по области НП (override)
}

interface Place {
	name: string
	region: string
	code: string
	surcharge: number
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
	const [places, setPlaces] = useState<Place[]>([])
	const [loading, setLoading] = useState(false)
	const boxRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const onDoc = (e: MouseEvent) => {
			if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
		}
		document.addEventListener('mousedown', onDoc)
		return () => document.removeEventListener('mousedown', onDoc)
	}, [])

	const trimmed = query.trim()

	// города-терминалы (локально, мгновенно)
	const terminals = useMemo(() => {
		const q = normalize(query)
		if (!q) return DIRECTIONS
		return DIRECTIONS.filter((d) => normalize(d.name).includes(q) || normalize(d.region).includes(q))
	}, [query])

	// населённые пункты (серверный поиск, с дебаунсом)
	useEffect(() => {
		if (trimmed.length < 2) {
			setPlaces([])
			setLoading(false)
			return
		}
		let active = true
		setLoading(true)
		const id = setTimeout(() => {
			fetch(`/api/places?q=${encodeURIComponent(trimmed)}`)
				.then((r) => (r.ok ? r.json() : []))
				.then((d: Place[]) => {
					if (active) setPlaces(Array.isArray(d) ? d : [])
				})
				.catch(() => {
					if (active) setPlaces([])
				})
				.finally(() => {
					if (active) setLoading(false)
				})
		}, 250)
		return () => {
			active = false
			clearTimeout(id)
		}
	}, [trimmed])

	const customExcluded = trimmed.length >= 2 && isExcluded(trimmed)

	// исключаем из списка НП те, что точно совпадают с городом-терминалом (чтобы не дублировать)
	const terminalNames = useMemo(() => new Set(DIRECTIONS.map((d) => normalize(d.name))), [])
	const settlements = useMemo(() => places.filter((p) => !terminalNames.has(normalize(p.name))), [places, terminalNames])

	const selectTerminal = (d: Direction) => {
		onChange({ code: d.code, name: d.name })
		setQuery('')
		setOpen(false)
	}
	const selectPlace = (p: Place) => {
		onChange({ code: p.code, name: p.name, surcharge: p.surcharge, approx: true })
		setQuery('')
		setOpen(false)
	}
	const clear = () => {
		onChange(null)
		setQuery('')
		setOpen(true)
	}

	const nothing = !loading && terminals.length === 0 && settlements.length === 0 && !customExcluded

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
					<span className="flex-1 min-w-0 flex items-center gap-2">
						<span className="text-sm font-medium text-slate-900 truncate">{value.name}</span>
						{value.approx && (
							<span className="shrink-0 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
								{t('calcApproxBadge')}
							</span>
						)}
					</span>
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
					{loading ? (
						<Spinner className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500" />
					) : (
						<ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
					)}
				</div>
			)}

			{open && !value && (
				<div className="absolute z-30 mt-1.5 w-full max-h-80 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg py-1">
					{customExcluded && (
						<div className="flex items-start gap-2 px-3 py-2 text-xs text-red-600">
							<AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
							<span>{t('calcExcludedDesc')}</span>
						</div>
					)}

					{/* Города-терминалы */}
					{terminals.length > 0 && (
						<>
							<p className="px-3 pt-1.5 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
								{t('calcSectionCities')}
							</p>
							{terminals.slice(0, 40).map((d) => (
								<button
									key={d.code}
									type="button"
									onClick={() => selectTerminal(d)}
									className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50 transition-colors">
									<Building2 className="w-3.5 h-3.5 text-slate-300 shrink-0" />
									<span className="min-w-0 flex-1">
										<span className="block text-sm text-slate-700 truncate">{d.name}</span>
										{d.region && d.region !== d.name && (
											<span className="block text-[11px] text-slate-400 truncate">{d.region}</span>
										)}
									</span>
								</button>
							))}
						</>
					)}

					{/* Населённые пункты (села, посёлки, деревни…) */}
					{settlements.length > 0 && (
						<>
							<p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wide border-t border-slate-100 mt-1">
								{t('calcSectionSettlements')}
							</p>
							{settlements.map((p, i) => (
								<button
									key={`${p.name}-${p.region}-${i}`}
									type="button"
									onClick={() => selectPlace(p)}
									className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-amber-50/60 transition-colors">
									<Home className="w-3.5 h-3.5 text-amber-400 shrink-0" />
									<span className="min-w-0 flex-1">
										<span className="block text-sm text-slate-700 truncate">{p.name}</span>
										<span className="block text-[11px] text-slate-400 truncate">{p.region}</span>
									</span>
								</button>
							))}
						</>
					)}

					{loading && settlements.length === 0 && (
						<p className="px-3 py-3 text-sm text-slate-400 text-center inline-flex items-center justify-center gap-2 w-full">
							<Spinner className="w-4 h-4 text-orange-500" />
							{t('calcSearchingPlaces')}
						</p>
					)}
					{nothing && <p className="px-3 py-3 text-sm text-slate-400 text-center">{t('calcNoResults')}</p>}
				</div>
			)}

			{value?.approx && (
				<p className="mt-1.5 text-[11px] text-slate-400">{t('calcApproxHint')}</p>
			)}
		</div>
	)
}
