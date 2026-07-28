'use client'

import { Plus, Trash2, LayoutGrid } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { placeVolume, type LengthUnit, type Place } from '@/lib/calculator/engine'
import type { Preset } from '@/lib/calculator/presets'
import { DecimalInput } from './DecimalInput'

interface PlacesEditorProps {
	places: Place[]
	unit: LengthUnit
	onUnitChange: (u: LengthUnit) => void
	onUpdate: (index: number, patch: Partial<Place>) => void
	onAdd: () => void
	onRemove: (index: number) => void
	// Админ-режим (страница «Создать накладную», правка 1): показываем поля
	// «Название техники» и «Себестоимость/шт» + быструю подстановку шаблона мото.
	captureCargo?: boolean
	presets?: Preset[]
	onAddFromPreset?: (preset: Preset) => void
}

const fmt = (n: number) => Number(n.toFixed(3)).toString()

export function PlacesEditor({
	places,
	unit,
	onUnitChange,
	onUpdate,
	onAdd,
	onRemove,
	captureCargo = false,
	presets = [],
	onAddFromPreset,
}: PlacesEditorProps) {
	const { t, tf } = useLang()

	const numField = (
		label: string,
		value: number,
		onChange: (v: number) => void,
		opts: { placeholder?: string; integer?: boolean } = {}
	) => (
		<div className="flex-1 min-w-0">
			<label className="block text-[10px] font-medium text-slate-400 dark:text-zinc-500 mb-1">{label}</label>
			<DecimalInput
				value={value}
				onChange={onChange}
				integer={opts.integer}
				placeholder={opts.placeholder ?? '0'}
				ariaLabel={label}
				className="w-full px-2.5 py-2 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-slate-900 dark:text-zinc-100 placeholder-slate-300 dark:placeholder-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all text-sm"
			/>
		</div>
	)

	return (
		<div className="flex flex-col gap-3">
			{/* Unit toggle */}
			<div className="flex items-center justify-between">
				<span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wide">
					{t('calcUnitLabel')}
				</span>
				<div className="inline-flex items-center bg-slate-100 dark:bg-zinc-800 rounded-lg p-0.5 select-none">
					{(['m', 'cm'] as LengthUnit[]).map((u) => (
						<button
							key={u}
							type="button"
							onClick={() => onUnitChange(u)}
							className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
								unit === u ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-sm' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'
							}`}>
							{u === 'm' ? t('calcUnitMeters') : t('calcUnitCm')}
						</button>
					))}
				</div>
			</div>

			{/* Быстрая подстановка шаблона мототехники в новую позицию (админ, правка 1) */}
			{captureCargo && presets.length > 0 && onAddFromPreset && (
				<div className="relative">
					<LayoutGrid className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500 pointer-events-none" />
					<select
						value=""
						onChange={(e) => {
							const p = presets.find((x) => x.id === e.target.value)
							if (p) onAddFromPreset(p)
						}}
						className="w-full appearance-none pl-10 pr-8 py-2.5 bg-white dark:bg-zinc-800 border border-dashed border-slate-300 dark:border-zinc-600 rounded-lg text-slate-600 dark:text-zinc-300 text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all cursor-pointer hover:border-orange-300">
						<option value="">{t('calcFromPreset')}…</option>
						{presets.map((p) => (
							<option key={p.id} value={p.id}>
								{p.name} · {p.length}×{p.width}×{p.height} {t('calcUnitCm')} · {p.weight} {t('calcKg')}
							</option>
						))}
					</select>
				</div>
			)}

			{places.map((p, i) => {
				const vol = placeVolume(p, unit)
				const total = vol * Math.max(0, p.quantity || 0)
				return (
					<div key={p.id ?? i} className="rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50/60 dark:bg-zinc-800/40 p-3">
						<div className="flex items-center justify-between mb-2">
							<span className="text-xs font-semibold text-slate-600 dark:text-zinc-300">{tf('calcPlaceTitle', { n: i + 1 })}</span>
							{places.length > 1 && (
								<button
									type="button"
									onClick={() => onRemove(i)}
									className="inline-flex items-center gap-1 text-[11px] text-slate-400 dark:text-zinc-500 hover:text-red-500 transition-colors">
									<Trash2 className="w-3.5 h-3.5" />
									{t('calcRemove')}
								</button>
							)}
						</div>
						{/* Название техники (админ, правка 1) */}
						{captureCargo && (
							<div className="mb-2">
								<label className="block text-[10px] font-medium text-slate-400 dark:text-zinc-500 mb-1">{t('calcCargoName')}</label>
								<input
									type="text"
									value={p.name ?? ''}
									onChange={(e) => onUpdate(i, { name: e.target.value })}
									placeholder={t('calcNamePh')}
									className="w-full px-2.5 py-2 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-slate-900 dark:text-zinc-100 placeholder-slate-300 dark:placeholder-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all text-sm"
								/>
							</div>
						)}
						<div className="flex gap-2 mb-2">
							{numField(t('calcDimLength'), p.length, (v) => onUpdate(i, { length: v }))}
							{numField(t('calcDimWidth'), p.width, (v) => onUpdate(i, { width: v }))}
							{numField(t('calcDimHeight'), p.height, (v) => onUpdate(i, { height: v }))}
						</div>
						<div className="flex gap-2">
							{numField(t('calcDimWeight'), p.weight, (v) => onUpdate(i, { weight: v }))}
							{numField(t('calcDimQty'), p.quantity, (v) => onUpdate(i, { quantity: v }), { placeholder: '1', integer: true })}
							{captureCargo && numField(t('calcCargoUnitCost'), p.unitCost ?? 0, (v) => onUpdate(i, { unitCost: v }))}
						</div>
						{total > 0 && (
							<p className="mt-2 text-[11px] text-slate-500 dark:text-zinc-400">
								{tf('calcPlaceVolume', { v: fmt(vol), q: Math.max(0, p.quantity || 0), total: fmt(total) })}
							</p>
						)}
					</div>
				)
			})}

			<button
				type="button"
				onClick={onAdd}
				className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-dashed border-slate-300 dark:border-zinc-600 text-sm font-medium text-slate-600 dark:text-zinc-300 hover:border-orange-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
				<Plus className="w-4 h-4" />
				{t('calcAddPlace')}
			</button>
		</div>
	)
}
