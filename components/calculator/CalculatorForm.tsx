'use client'

import { useEffect, useMemo, useState } from 'react'
import { MapPin, Lock, Ruler, ClipboardList, LayoutGrid } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { ORIGIN_CITY, ORIGIN_COUNTRY, RUB_TO_KZT } from '@/lib/calculator/config'
import {
	calcShipment,
	findDirection,
	sumPlaces,
	type CalcResult,
	type LengthUnit,
	type Place,
} from '@/lib/calculator/engine'
import type { Preset } from '@/lib/calculator/presets'
import { CitySelect, type CitySelection } from './CitySelect'
import { PlacesEditor } from './PlacesEditor'
import { PresetPicker } from './PresetPicker'
import { ResultPanel } from './ResultPanel'
import { DecimalInput } from './DecimalInput'

type Mode = 'presets' | 'dimensions' | 'totals'

let placeSeq = 0
const emptyPlace = (): Place => ({ id: `place-${++placeSeq}`, length: 0, width: 0, height: 0, weight: 0, quantity: 1 })

export function CalculatorForm({ showDisclaimer = true }: { showDisclaimer?: boolean } = {}) {
	const { t } = useLang()

	const [selection, setSelection] = useState<CitySelection | null>(null)
	const [mode, setMode] = useState<Mode>('presets')
	const [volume, setVolume] = useState<number>(0)
	const [weight, setWeight] = useState<number>(0)
	const [unit, setUnit] = useState<LengthUnit>('m')
	const [places, setPlaces] = useState<Place[]>([emptyPlace()])
	const [rate, setRate] = useState<number>(RUB_TO_KZT)

	const [presets, setPresets] = useState<Preset[]>([])
	const [presetsLoading, setPresetsLoading] = useState<boolean>(true)
	const [quantities, setQuantities] = useState<Record<string, number>>({})

	// Актуальный курс ₽→₸ (Нацбанк РК); при ошибке остаётся запасной из конфига
	useEffect(() => {
		let active = true
		fetch('/api/rate')
			.then((r) => r.json())
			.then((d) => {
				if (active && d && typeof d.rate === 'number' && d.rate > 0) setRate(d.rate)
			})
			.catch(() => {})
		return () => {
			active = false
		}
	}, [])

	// Пресеты грузов из админки
	useEffect(() => {
		let active = true
		fetch('/api/presets')
			.then((r) => (r.ok ? r.json() : []))
			.then((d) => {
				if (active && Array.isArray(d)) setPresets(d)
			})
			.catch(() => {})
			.finally(() => {
				if (active) setPresetsLoading(false)
			})
		return () => {
			active = false
		}
	}, [])

	const direction = useMemo(() => (selection ? findDirection(selection.code) ?? null : null), [selection])

	// Пресеты считаются ТЕМ ЖЕ движком, что и «Свой груз» (improves2.0): габариты+вес → тариф.
	// Поэтому пресет и «Свой груз» с теми же размерами дают одинаковую стоимость.
	const presetPlaces = useMemo<Place[]>(
		() =>
			presets
				.filter((p) => (quantities[p.id] ?? 0) > 0)
				.map((p) => ({
					length: p.length,
					width: p.width,
					height: p.height,
					weight: p.weight,
					quantity: quantities[p.id],
				})),
		[presets, quantities]
	)

	const result: CalcResult = useMemo(() => {
		// город (а значит — надбавка) нужен во всех режимах; для НП вне списка терминалов
		// берём надбавку самого НП (override), тариф — по ближайшему городу-терминалу
		const dir = direction
			? {
					...direction,
					name: selection?.name ?? direction.name,
					surcharge: selection && selection.surcharge !== undefined ? selection.surcharge : direction.surcharge,
				}
			: null
		const totals =
			mode === 'presets'
				? sumPlaces(presetPlaces, 'cm') // габариты пресетов — в сантиметрах
				: mode === 'dimensions'
					? sumPlaces(places, unit)
					: { totalVolume: volume || 0, totalWeight: weight || 0, totalPlaces: 1 }
		return calcShipment({ direction: dir, totals, rate })
	}, [direction, selection, mode, presetPlaces, places, unit, volume, weight, rate])

	const updatePlace = (index: number, patch: Partial<Place>) =>
		setPlaces((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)))
	const addPlace = () => setPlaces((prev) => [...prev, emptyPlace()])
	const removePlace = (index: number) => setPlaces((prev) => prev.filter((_, i) => i !== index))
	const setQty = (id: string, qty: number) => setQuantities((prev) => ({ ...prev, [id]: Math.max(0, qty) }))

	const numInput = (value: number, onChange: (v: number) => void, placeholder: string) => (
		<DecimalInput
			value={value}
			onChange={onChange}
			placeholder={placeholder}
			className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-300 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all text-sm"
		/>
	)

	const tab = (m: Mode, Icon: typeof Ruler, label: string) => (
		<button
			type="button"
			onClick={() => setMode(m)}
			className={`flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium leading-tight text-center transition-all ${
				mode === m ? 'bg-orange-500 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
			}`}>
			<Icon className="w-4 h-4 shrink-0" />
			<span>{label}</span>
		</button>
	)

	return (
		<div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
			{/* Form */}
			<div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4">
				{/* Origin (fixed) */}
				<div>
					<label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
						{t('calcOriginLabel')}
					</label>
					<div className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg">
						<MapPin className="w-4 h-4 text-slate-400 shrink-0" />
						<span className="flex-1 text-sm font-medium text-slate-700">
							{ORIGIN_CITY}, {ORIGIN_COUNTRY}
						</span>
						<Lock className="w-3.5 h-3.5 text-slate-300" />
					</div>
				</div>

				{/* Destination */}
				<CitySelect value={selection} onChange={setSelection} />

				{/* Mode tabs */}
				<div className="flex flex-col sm:flex-row gap-2 pt-1">
					{tab('presets', LayoutGrid, t('calcModePresets'))}
					{tab('dimensions', Ruler, t('calcModeCustom'))}
					{tab('totals', ClipboardList, t('calcModeTotals'))}
				</div>

				{/* Inputs */}
				{mode === 'presets' ? (
					<PresetPicker
						presets={presets}
						quantities={quantities}
						onChange={setQty}
						onCustomCargo={() => setMode('dimensions')}
						loading={presetsLoading}
					/>
				) : mode === 'totals' ? (
					<div className="grid grid-cols-2 gap-3">
						<div>
							<label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
								{t('calcVolumeLabel')}
							</label>
							{numInput(volume, setVolume, t('calcVolumePh'))}
						</div>
						<div>
							<label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
								{t('calcWeightLabel')}
							</label>
							{numInput(weight, setWeight, t('calcWeightPh'))}
						</div>
					</div>
				) : (
					<PlacesEditor
						places={places}
						unit={unit}
						onUnitChange={setUnit}
						onUpdate={updatePlace}
						onAdd={addPlace}
						onRemove={removePlace}
					/>
				)}
			</div>

			{/* Result */}
			<div className="lg:col-span-2">
				<div className="lg:sticky lg:top-6">
					<ResultPanel result={result} showDisclaimer={showDisclaimer} />
				</div>
			</div>
		</div>
	)
}
