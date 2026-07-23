'use client'

import { useMemo, useState } from 'react'
import { Bike, Truck, Package, Minus, Plus, Check, PencilRuler, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import type { Preset } from '@/lib/calculator/presets'
import { Spinner } from '@/components/Spinner'
import { DecimalInput } from './DecimalInput'

interface PresetPickerProps {
	presets: Preset[]
	quantities: Record<string, number>
	onChange: (id: string, qty: number) => void
	onCustomCargo: () => void
	loading: boolean
}

const ru = (n: number) => n.toLocaleString('ru-RU')
const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е').trim()
const PAGE_SIZE = 4

function CategoryIcon({ category }: { category: string | null }) {
	const cls = 'w-7 h-7 text-slate-300 dark:text-zinc-600'
	if (category === 'Мото' || category === 'Электро') return <Bike className={cls} />
	if (category === 'Квадроцикл' || category === 'Трицикл') return <Truck className={cls} />
	return <Package className={cls} />
}

export function PresetPicker({ presets, quantities, onChange, onCustomCargo, loading }: PresetPickerProps) {
	const { t, tf } = useLang()
	const [query, setQuery] = useState('')
	const [page, setPage] = useState(1)

	const filtered = useMemo(() => {
		const q = norm(query)
		if (!q) return presets
		return presets.filter((p) => norm(p.name).includes(q) || (p.category ? norm(p.category).includes(q) : false))
	}, [presets, query])

	const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
	const safePage = Math.min(page, pages)
	const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
	const selectedCount = Object.values(quantities).reduce((s, q) => s + (q > 0 ? q : 0), 0)

	const onSearch = (v: string) => {
		setQuery(v)
		setPage(1)
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center py-10 text-slate-400 dark:text-zinc-500">
				<Spinner className="w-5 h-5 text-orange-500" />
			</div>
		)
	}

	return (
		<div className="flex flex-col gap-3">
			{presets.length === 0 ? (
				<p className="text-sm text-slate-400 dark:text-zinc-500 text-center py-6">{t('calcPresetsEmpty')}</p>
			) : (
				<>
					{/* Поиск */}
					<div className="relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500 pointer-events-none" />
						<input
							type="text"
							value={query}
							onChange={(e) => onSearch(e.target.value)}
							placeholder={t('presetSearchPlaceholder')}
							className="w-full pl-10 pr-3 py-2.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all text-sm"
						/>
					</div>

					{filtered.length === 0 ? (
						<p className="text-sm text-slate-400 dark:text-zinc-500 text-center py-6">{t('presetNothingFound')}</p>
					) : (
						<>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
								{pageItems.map((p) => {
									const qty = quantities[p.id] ?? 0
									const selected = qty > 0
									return (
										<div
											key={p.id}
											className={`rounded-xl border p-2.5 transition-all ${
												selected ? 'border-orange-400 bg-orange-50/50 dark:bg-orange-500/10 ring-1 ring-orange-200 dark:ring-orange-500/30' : 'border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900'
											}`}>
											<div className="flex gap-2.5">
												<div className="w-14 h-14 shrink-0 rounded-lg bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800 overflow-hidden flex items-center justify-center">
													{p.imageUrl ? (
														// eslint-disable-next-line @next/next/no-img-element
														<img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
													) : (
														<CategoryIcon category={p.category} />
													)}
												</div>
												<div className="min-w-0 flex-1">
													<p className="text-sm font-semibold text-slate-900 dark:text-zinc-100 leading-tight break-words">{p.name}</p>
													<p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
														{ru(p.length)}×{ru(p.width)}×{ru(p.height)} {t('calcUnitCm')} · {ru(p.weight)} {t('calcKg')}
													</p>
												</div>
											</div>

											{selected ? (
												<div className="mt-2.5 flex items-center justify-between">
													<span className="text-[11px] text-slate-500 dark:text-zinc-400">{t('calcPresetQtyLabel')}</span>
													<div className="inline-flex items-center gap-1">
														<button
															type="button"
															aria-label="−"
															onClick={() => onChange(p.id, Math.max(0, qty - 1))}
															className="w-7 h-7 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors">
															<Minus className="w-3.5 h-3.5" />
														</button>
														<DecimalInput
															value={qty}
															onChange={(v) => onChange(p.id, v)}
															integer
															min={1}
															ariaLabel={t('calcPresetQtyLabel')}
															className="w-12 px-1 py-1 text-center text-sm font-semibold text-slate-900 dark:text-zinc-100 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10"
														/>
														<button
															type="button"
															aria-label="+"
															onClick={() => onChange(p.id, qty + 1)}
															className="w-7 h-7 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors">
															<Plus className="w-3.5 h-3.5" />
														</button>
													</div>
												</div>
											) : (
												<button
													type="button"
													onClick={() => onChange(p.id, 1)}
													className="mt-2.5 w-full inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 text-[12px] font-medium text-slate-600 dark:text-zinc-300 hover:border-orange-300 hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
													<Plus className="w-3.5 h-3.5" />
													{t('calcPresetSelect')}
												</button>
											)}
										</div>
									)
								})}
							</div>

							{/* Пагинация */}
							{pages > 1 && (
								<div className="flex items-center justify-center gap-3 pt-1">
									<button
										type="button"
										aria-label="prev"
										disabled={safePage <= 1}
										onClick={() => setPage(Math.max(1, safePage - 1))}
										className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
										<ChevronLeft className="w-4 h-4" />
									</button>
									<span className="text-xs text-slate-500 dark:text-zinc-400">{tf('pageOf', { page: safePage, pages })}</span>
									<button
										type="button"
										aria-label="next"
										disabled={safePage >= pages}
										onClick={() => setPage(Math.min(pages, safePage + 1))}
										className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
										<ChevronRight className="w-4 h-4" />
									</button>
								</div>
							)}
						</>
					)}
				</>
			)}

			{/* Свой груз — всегда доступен, вне пагинации */}
			<button
				type="button"
				onClick={onCustomCargo}
				className="rounded-xl border border-dashed border-slate-300 dark:border-zinc-600 p-3 flex items-center justify-center gap-2 text-slate-500 dark:text-zinc-400 hover:border-orange-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
				<PencilRuler className="w-5 h-5" />
				<span className="text-sm font-medium">{t('calcCustomCargoButton')}</span>
				<span className="text-[11px] text-slate-400 dark:text-zinc-500 hidden sm:inline">· {t('calcCustomCargoHint')}</span>
			</button>

			{/* Итого по выбранным единицам */}
			{selectedCount > 0 && (
				<p className="text-[11px] text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
					<Check className="w-3.5 h-3.5 text-orange-500" />
					{tf('calcPresetSelectedCount', { count: selectedCount })}
				</p>
			)}
		</div>
	)
}
