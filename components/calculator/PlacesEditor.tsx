'use client'

import { Plus, Trash2 } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { placeVolume, type LengthUnit, type Place } from '@/lib/calculator/engine'
import { DecimalInput } from './DecimalInput'

interface PlacesEditorProps {
	places: Place[]
	unit: LengthUnit
	onUnitChange: (u: LengthUnit) => void
	onUpdate: (index: number, patch: Partial<Place>) => void
	onAdd: () => void
	onRemove: (index: number) => void
}

const fmt = (n: number) => Number(n.toFixed(3)).toString()

export function PlacesEditor({ places, unit, onUnitChange, onUpdate, onAdd, onRemove }: PlacesEditorProps) {
	const { t, tf } = useLang()

	const numField = (
		label: string,
		value: number,
		onChange: (v: number) => void,
		opts: { placeholder?: string; integer?: boolean } = {}
	) => (
		<div className="flex-1 min-w-0">
			<label className="block text-[10px] font-medium text-slate-400 mb-1">{label}</label>
			<DecimalInput
				value={value}
				onChange={onChange}
				integer={opts.integer}
				placeholder={opts.placeholder ?? '0'}
				ariaLabel={label}
				className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-300 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all text-sm"
			/>
		</div>
	)

	return (
		<div className="flex flex-col gap-3">
			{/* Unit toggle */}
			<div className="flex items-center justify-between">
				<span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
					{t('calcUnitLabel')}
				</span>
				<div className="inline-flex items-center bg-slate-100 rounded-lg p-0.5 select-none">
					{(['m', 'cm'] as LengthUnit[]).map((u) => (
						<button
							key={u}
							type="button"
							onClick={() => onUnitChange(u)}
							className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
								unit === u ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
							}`}>
							{u === 'm' ? t('calcUnitMeters') : t('calcUnitCm')}
						</button>
					))}
				</div>
			</div>

			{places.map((p, i) => {
				const vol = placeVolume(p, unit)
				const total = vol * Math.max(0, p.quantity || 0)
				return (
					<div key={p.id ?? i} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
						<div className="flex items-center justify-between mb-2">
							<span className="text-xs font-semibold text-slate-600">{tf('calcPlaceTitle', { n: i + 1 })}</span>
							{places.length > 1 && (
								<button
									type="button"
									onClick={() => onRemove(i)}
									className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-red-500 transition-colors">
									<Trash2 className="w-3.5 h-3.5" />
									{t('calcRemove')}
								</button>
							)}
						</div>
						<div className="flex gap-2 mb-2">
							{numField(t('calcDimLength'), p.length, (v) => onUpdate(i, { length: v }))}
							{numField(t('calcDimWidth'), p.width, (v) => onUpdate(i, { width: v }))}
							{numField(t('calcDimHeight'), p.height, (v) => onUpdate(i, { height: v }))}
						</div>
						<div className="flex gap-2">
							{numField(t('calcDimWeight'), p.weight, (v) => onUpdate(i, { weight: v }))}
							{numField(t('calcDimQty'), p.quantity, (v) => onUpdate(i, { quantity: v }), { placeholder: '1', integer: true })}
						</div>
						{total > 0 && (
							<p className="mt-2 text-[11px] text-slate-500">
								{tf('calcPlaceVolume', { v: fmt(vol), q: Math.max(0, p.quantity || 0), total: fmt(total) })}
							</p>
						)}
					</div>
				)
			})}

			<button
				type="button"
				onClick={onAdd}
				className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-dashed border-slate-300 text-sm font-medium text-slate-600 hover:border-orange-400 hover:text-orange-600 transition-colors">
				<Plus className="w-4 h-4" />
				{t('calcAddPlace')}
			</button>
		</div>
	)
}
