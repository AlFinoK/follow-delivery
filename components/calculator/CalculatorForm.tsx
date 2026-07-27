'use client'

import { useEffect, useMemo, useState } from 'react'
import { MapPin, Lock, Ruler, ClipboardList, LayoutGrid, ClipboardCheck } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { repos } from '@/lib/data/repos'
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
const isEmptyPlace = (p: Place) => !p.length && !p.width && !p.height && !p.weight && !(p.name && p.name.trim())

// Одна позиция для переноса в накладную/сводку логистам (правка 2). Габариты — в см.
export interface CalcCargoPosition {
	name: string
	length: number
	width: number
	height: number
	weight: number
	quantity: number
	price: number // себестоимость за шт, ₸
}
export interface CalcCargoSnapshot {
	positions: CalcCargoPosition[]
	volume: number // м³
	weight: number // кг
	price: number // стоимость доставки, ₸
}

export function CalculatorForm({
	showDisclaimer = true,
	onResult,
	prefill,
	captureCargo = false,
	onCopyCargo,
}: {
	showDisclaimer?: boolean
	// Мост наружу: родитель получает итог расчёта (для «Суммы к оплате» накладной)
	onResult?: (r: CalcResult) => void
	// Обратный мост: параметры груза из накладной → калькулятор (режим «Итого»)
	prefill?: { mode?: 'totals'; volume?: number; weight?: number }
	// Админ-режим (страница «Создать накладную», правка 1): поля названия/себестоимости
	// в «Свой груз», подстановка шаблона и кнопка копирования данных в накладную.
	captureCargo?: boolean
	// Копирование данных калькулятора в накладную/сводку логистам (правка 2)
	onCopyCargo?: (snapshot: CalcCargoSnapshot) => void
} = {}) {
	const { t } = useLang()
	const repo = repos

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

	// Шаблоны грузов из админки — через слой репозиториев ([lib/data/repos.ts]).
	useEffect(() => {
		let active = true
		repo.presets
			.list()
			.then((d) => {
				if (active) setPresets(d)
			})
			.catch(() => {})
			.finally(() => {
				if (active) setPresetsLoading(false)
			})
		return () => {
			active = false
		}
	}, [repo])

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

	// Сообщаем родителю актуальный результат (мост в «Сумму к оплате»).
	// Зависимость только от result — берём текущий onResult из замыкания.
	useEffect(() => {
		onResult?.(result)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [result])

	// Приём габаритов из накладной. Родитель перемонтирует форму (key) с новым prefill,
	// поэтому эффект отрабатывает один раз при монтировании.
	useEffect(() => {
		if (!prefill) return
		if (prefill.mode === 'totals') {
			setMode('totals')
			if (typeof prefill.volume === 'number') setVolume(prefill.volume)
			if (typeof prefill.weight === 'number') setWeight(prefill.weight)
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [prefill])

	const updatePlace = (index: number, patch: Partial<Place>) =>
		setPlaces((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)))
	const addPlace = () => setPlaces((prev) => [...prev, emptyPlace()])
	const removePlace = (index: number) => setPlaces((prev) => prev.filter((_, i) => i !== index))
	const setQty = (id: string, qty: number) => setQuantities((prev) => ({ ...prev, [id]: Math.max(0, qty) }))

	// Подстановка шаблона мото в позицию «Свой груз» (админ, правка 1). Габариты шаблона
	// заданы в см — конвертируем в текущую единицу. Пустую единственную позицию заполняем,
	// иначе добавляем новую.
	const addPlaceFromPreset = (preset: Preset) => {
		const div = unit === 'cm' ? 1 : 100
		const filled: Place = {
			id: `place-${++placeSeq}`,
			length: preset.length / div,
			width: preset.width / div,
			height: preset.height / div,
			weight: preset.weight,
			quantity: 1,
			name: preset.name,
		}
		setPlaces((prev) => (prev.length === 1 && isEmptyPlace(prev[0]) ? [filled] : [...prev, filled]))
	}

	// Снапшот данных калькулятора для переноса в накладную/сводку логистам (правка 2).
	// Габариты приводим к см (формат накладной). Работает в режимах «Свой груз» и «Шаблоны».
	const cargoSnapshot = (): CalcCargoSnapshot => {
		const toCm = unit === 'cm' ? 1 : 100
		const positions: CalcCargoPosition[] =
			mode === 'dimensions'
				? places
						.filter((p) => (p.quantity || 0) > 0 && !isEmptyPlace(p))
						.map((p) => ({
							name: p.name?.trim() ?? '',
							length: (p.length || 0) * toCm,
							width: (p.width || 0) * toCm,
							height: (p.height || 0) * toCm,
							weight: p.weight || 0,
							quantity: p.quantity || 1,
							price: p.unitCost ?? 0,
						}))
				: mode === 'presets'
					? presets
							.filter((p) => (quantities[p.id] ?? 0) > 0)
							.map((p) => ({
								name: p.name,
								length: p.length,
								width: p.width,
								height: p.height,
								weight: p.weight,
								quantity: quantities[p.id],
								// Себестоимость техники из шаблона (ПРАВКИ 2, п.1). Клиентам
								// /api/presets её не отдаёт → в публичном калькуляторе 0.
								price: p.goodsPrice ?? 0,
							}))
					: []
		return {
			positions,
			volume: result.totals?.totalVolume ?? 0,
			weight: result.totals?.totalWeight ?? 0,
			price: result.ok && typeof result.price === 'number' ? result.price : 0,
		}
	}

	const numInput = (value: number, onChange: (v: number) => void, placeholder: string) => (
		<DecimalInput
			value={value}
			onChange={onChange}
			placeholder={placeholder}
			className="w-full px-3 py-2.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-slate-900 dark:text-zinc-100 placeholder-slate-300 dark:placeholder-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all text-sm"
		/>
	)

	const tab = (m: Mode, Icon: typeof Ruler, label: string) => (
		<button
			type="button"
			onClick={() => setMode(m)}
			className={`flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium leading-tight text-center transition-all ${
				mode === m ? 'bg-orange-500 text-white shadow-sm' : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
			}`}>
			<Icon className="w-4 h-4 shrink-0" />
			<span>{label}</span>
		</button>
	)

	return (
		<div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
			{/* Form */}
			<div className="lg:col-span-3 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-700 shadow-sm p-4 sm:p-5 flex flex-col gap-3.5">
				{/* Origin (fixed) */}
				<div>
					<label className="block text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wide mb-1.5">
						{t('calcOriginLabel')}
					</label>
					<div className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-700 rounded-lg">
						<MapPin className="w-4 h-4 text-slate-400 dark:text-zinc-500 shrink-0" />
						<span className="flex-1 text-sm font-medium text-slate-700 dark:text-zinc-200">
							{ORIGIN_CITY}, {ORIGIN_COUNTRY}
						</span>
						<Lock className="w-3.5 h-3.5 text-slate-300 dark:text-zinc-600" />
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
							<label className="block text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wide mb-1.5">
								{t('calcVolumeLabel')}
							</label>
							{numInput(volume, setVolume, t('calcVolumePh'))}
						</div>
						<div>
							<label className="block text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wide mb-1.5">
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
						captureCargo={captureCargo}
						presets={presets}
						onAddFromPreset={addPlaceFromPreset}
					/>
				)}

				{/* Копирование данных калькулятора в накладную/сводку логистам (админ, правка 2) */}
				{captureCargo && onCopyCargo && mode !== 'totals' && (
					<button
						type="button"
						onClick={() => onCopyCargo(cargoSnapshot())}
						className="mt-1 inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition-colors">
						<ClipboardCheck className="w-4 h-4" />
						{t('calcCopyToWaybill')}
					</button>
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
