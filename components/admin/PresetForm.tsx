'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { Spinner } from '@/components/Spinner'
import { DecimalInput } from '@/components/calculator/DecimalInput'

export interface PresetFormValues {
	name: string
	category: string
	length: number
	width: number
	height: number
	weight: number
	basePrice: number
	imageUrl: string
	sortOrder: number
	active: boolean
}

interface PresetFormProps {
	initial?: Partial<PresetFormValues>
	saving?: boolean
	onSubmit: (values: PresetFormValues) => void
	onCancel: () => void
}

const CATEGORIES = ['Квадроцикл', 'Трицикл', 'Мото', 'Электро']

export function PresetForm({ initial, saving, onSubmit, onCancel }: PresetFormProps) {
	const { t } = useLang()
	const [name, setName] = useState(initial?.name ?? '')
	const [category, setCategory] = useState(initial?.category ?? '')
	const [length, setLength] = useState(initial?.length ?? 0)
	const [width, setWidth] = useState(initial?.width ?? 0)
	const [height, setHeight] = useState(initial?.height ?? 0)
	const [weight, setWeight] = useState(initial?.weight ?? 0)
	const [basePrice, setBasePrice] = useState(initial?.basePrice ?? 0)
	const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? '')
	const [sortOrder, setSortOrder] = useState(initial?.sortOrder ?? 0)
	const [active, setActive] = useState(initial?.active ?? true)

	const inputCls =
		'w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all text-sm'
	const labelCls = 'block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1'

	const submit = (e: React.FormEvent) => {
		e.preventDefault()
		if (!name.trim()) return
		onSubmit({ name: name.trim(), category: category.trim(), length, width, height, weight, basePrice, imageUrl: imageUrl.trim(), sortOrder, active })
	}

	return (
		<form onSubmit={submit} className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col gap-3">
			<div>
				<label className={labelCls}>{t('presetNameLabel')}</label>
				<input type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus className={inputCls} />
			</div>

			<div className="grid grid-cols-2 gap-3">
				<div>
					<label className={labelCls}>{t('presetCategoryLabel')}</label>
					<input type="text" list="preset-categories" value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls} />
					<datalist id="preset-categories">
						{CATEGORIES.map((c) => (
							<option key={c} value={c} />
						))}
					</datalist>
				</div>
				<div>
					<label className={labelCls}>{t('presetSortLabel')}</label>
					<DecimalInput value={sortOrder} onChange={setSortOrder} integer min={-100000} className={inputCls} />
				</div>
			</div>

			<div className="grid grid-cols-3 gap-3">
				<div>
					<label className={labelCls}>{t('presetLengthLabel')}</label>
					<DecimalInput value={length} onChange={setLength} className={inputCls} />
				</div>
				<div>
					<label className={labelCls}>{t('presetWidthLabel')}</label>
					<DecimalInput value={width} onChange={setWidth} className={inputCls} />
				</div>
				<div>
					<label className={labelCls}>{t('presetHeightLabel')}</label>
					<DecimalInput value={height} onChange={setHeight} className={inputCls} />
				</div>
			</div>

			<div className="grid grid-cols-2 gap-3">
				<div>
					<label className={labelCls}>{t('presetWeightLabel')}</label>
					<DecimalInput value={weight} onChange={setWeight} className={inputCls} />
				</div>
				<div>
					<label className={labelCls}>{t('presetBasePriceLabel')}</label>
					<DecimalInput value={basePrice} onChange={setBasePrice} className={inputCls} />
				</div>
			</div>

			<div>
				<label className={labelCls}>{t('presetImageUrlLabel')}</label>
				<input
					type="text"
					value={imageUrl}
					onChange={(e) => setImageUrl(e.target.value)}
					placeholder="https://…"
					className={inputCls}
				/>
			</div>

			<label className="inline-flex items-center gap-2 text-sm text-slate-700 select-none cursor-pointer">
				<span className="relative inline-flex w-4 h-4 shrink-0">
					<input
						type="checkbox"
						checked={active}
						onChange={(e) => setActive(e.target.checked)}
						className="peer absolute inset-0 z-10 m-0 opacity-0 cursor-pointer"
					/>
					<span className="absolute inset-0 rounded border border-slate-300 bg-white transition-colors peer-checked:bg-orange-500 peer-checked:border-orange-500" />
					<Check className="absolute inset-0 m-auto w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" strokeWidth={3} />
				</span>
				{t('presetActiveLabel')}
			</label>

			<div className="flex gap-2 pt-1">
				<button
					type="submit"
					disabled={saving || !name.trim()}
					className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg disabled:opacity-50 transition-colors text-sm inline-flex items-center gap-2">
					{saving ? <Spinner className="w-4 h-4 text-white" /> : t('presetSaveButton')}
				</button>
				<button
					type="button"
					onClick={onCancel}
					className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg transition-colors text-sm">
					{t('cancelButton')}
				</button>
			</div>
		</form>
	)
}
