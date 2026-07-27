'use client'

import { useEffect, useRef, useState, type ComponentType } from 'react'
import PhoneInputLib, { getCountryCallingCode } from 'react-phone-number-input'
import flags from 'react-phone-number-input/flags'
import ru from 'react-phone-number-input/locale/ru.json'
import 'react-phone-number-input/style.css'
import { ChevronDown, Globe, Search } from 'lucide-react'
import { isPhoneValid } from '@/lib/waybill/model'

type CountryOption = { value?: string; label?: string; divider?: boolean }
const flagMap = flags as Record<string, ComponentType<{ title?: string }>>

const callingCode = (c?: string) => {
	if (!c) return ''
	try {
		return `+${getCountryCallingCode(c as never)}`
	} catch {
		return ''
	}
}

// Флаг страны (или глобус для «International»), масштабируется в свой контейнер.
function Flag({ country, label }: { country?: string; label?: string }) {
	const F = country ? flagMap[country] : undefined
	return (
		<span className="w-6 h-4 rounded-[2px] overflow-hidden shrink-0 bg-slate-100 dark:bg-zinc-800 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full">
			{F ? <F title={label} /> : <Globe className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />}
		</span>
	)
}

// Кастомный список стран для react-phone-number-input: флаги в списке + поиск +
// стили под тему (нативный select их не поддерживает). Заменяет невидимый <select>
// библиотеки; её собственные флаг/стрелка спрятаны в globals.css (.ltt-phone).
function CountrySelect({
	value,
	onChange,
	options,
	disabled,
}: {
	value?: string
	onChange: (value?: string) => void
	options: CountryOption[]
	disabled?: boolean
}) {
	const [open, setOpen] = useState(false)
	const [query, setQuery] = useState('')
	const rootRef = useRef<HTMLDivElement>(null)
	const searchRef = useRef<HTMLInputElement>(null)

	useEffect(() => {
		if (!open) return
		searchRef.current?.focus()
		const onDoc = (e: MouseEvent) => {
			if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
		}
		const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
		document.addEventListener('mousedown', onDoc)
		document.addEventListener('keydown', onKey)
		return () => {
			document.removeEventListener('mousedown', onDoc)
			document.removeEventListener('keydown', onKey)
		}
	}, [open])

	const q = query.trim().toLowerCase()
	const list = q ? options.filter((o) => !o.divider && o.label && o.label.toLowerCase().includes(q)) : options

	return (
		<div ref={rootRef} className="relative">
			<button
				type="button"
				disabled={disabled}
				onClick={() => setOpen((v) => !v)}
				className="flex items-center gap-1 pr-1 outline-none disabled:cursor-not-allowed"
				aria-label="Выбрать страну">
				<Flag country={value} label={value ? ru[value as keyof typeof ru] : 'International'} />
				<ChevronDown className={`w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`} />
			</button>

			{open && (
				<div className="absolute z-[60] left-0 top-full mt-2 w-72 max-w-[calc(100vw-2rem)] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-xl overflow-hidden">
					<div className="relative border-b border-slate-100 dark:border-zinc-800">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500 pointer-events-none" />
						<input
							ref={searchRef}
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Поиск страны…"
							className="w-full pl-9 pr-3 py-2.5 text-sm outline-none placeholder-slate-300 dark:placeholder-zinc-600"
						/>
					</div>
					<div className="max-h-64 overflow-y-auto py-1">
						{list.length === 0 && <p className="px-3 py-4 text-sm text-slate-400 dark:text-zinc-500 text-center">Ничего не найдено</p>}
						{list.map((o, i) => {
							const divider = o.divider || (!o.label && !o.value)
							if (divider) return <div key={`d${i}`} className="my-1 border-t border-slate-100 dark:border-zinc-800" />
							return (
								<button
									key={o.value ?? 'intl'}
									type="button"
									onClick={() => {
										onChange(o.value)
										setOpen(false)
										setQuery('')
									}}
									className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors ${
										o.value === value ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-300' : 'text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800/60'
									}`}>
									<Flag country={o.value} label={o.label} />
									<span className="flex-1 truncate">{o.label}</span>
									<span className="text-xs text-slate-400 dark:text-zinc-500">{callingCode(o.value)}</span>
								</button>
							)
						})}
					</div>
				</div>
			)}
		</div>
	)
}

// Телефон получателя: react-phone-number-input + кастомный список стран (флаги, поиск,
// стили). Код страны залочен, вводится только национальная часть; значение — E.164.
// Ошибка — после потери фокуса или при «Сохранить» (showError).
export function PhoneInput({
	value,
	disabled = false,
	showError = false,
	onChange,
}: {
	value: string
	disabled?: boolean
	showError?: boolean
	onChange: (phone: string) => void
}) {
	const [touched, setTouched] = useState(false)
	const invalid = (touched || showError) && !isPhoneValid(value)

	return (
		<div>
			<div
				onBlur={(e) => {
					// «тронуто» только когда фокус ушёл за пределы всего виджета (не на список стран/поиск)
					if (!e.currentTarget.contains(e.relatedTarget as Node)) setTouched(true)
				}}
				className={`ltt-phone flex items-center gap-2.5 bg-white dark:bg-zinc-800 border rounded-lg pl-3 pr-3.5 py-2.5 transition-all focus-within:ring-2 ${
					invalid
						? 'border-red-400 focus-within:border-red-500 focus-within:ring-red-500/10'
						: 'border-slate-200 dark:border-zinc-700 focus-within:border-orange-500 focus-within:ring-orange-500/10'
				} ${disabled ? 'opacity-60 pointer-events-none' : ''}`}>
				<PhoneInputLib
					international
					countryCallingCodeEditable={false}
					labels={ru}
					countrySelectComponent={CountrySelect as never}
					defaultCountry="RU"
					countryOptionsOrder={['RU', 'KZ', '|', '...']}
					value={value || undefined}
					disabled={disabled}
					onChange={(v) => onChange(v ?? '')}
					placeholder="Номер телефона"
				/>
			</div>
			{invalid && <p className="text-[11px] text-red-500 mt-1">Введите корректный номер телефона</p>}
		</div>
	)
}
