'use client'

import { useState } from 'react'
import { Check, Pencil } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { useDropdown } from './useDropdown'
import { DropdownTrigger } from './DropdownTrigger'

const CITIES_KZ = ['Алматы', 'Астана', 'Костанай', 'Шымкент', 'Актобе', 'Тараз', 'Павлодар', 'Усть-Каменогорск']
const CITIES_RU_LIST = ['Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Казань', 'Омск', 'Самара', 'Уфа']
const ALL_CITIES = [...CITIES_KZ, ...CITIES_RU_LIST]

const CHECK = <Check className="w-4 h-4 text-orange-500 shrink-0" />

// Флаги стран — картинкой, как в поле телефона (react-phone-number-input → country-flag-icons,
// формат 3x2). Эмодзи-флаги Windows не рисует и показывает буквами «KZ»/«RU», поэтому
// в подписях их больше нет. SVG — те же файлы country-flag-icons/3x2 (MIT), вшиты строками:
// весь набор флагов пакета (~330 КБ) ради трёх стран в бандл админки тянуть незачем.
const FLAG_SVG: Record<string, string> = {
	Казахстан:
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 513 342"><path fill="#36B6CC" d="M0 0h513v342H0V0z"/><circle fill="#FFD400" cx="256.5" cy="170.9" r="68.4"/><path fill="#FFD400" d="m256.5 251.5-27.9 41.7-7.1-49.7-43.2 25.5 15.2-47.8-50 4.2 34.4-36.5-46.9-18 46.8-18-34.4-36.5 50 4.2-15.2-47.8 43.2 25.4 7.1-49.7 27.9 41.7 27.9-41.7 7.1 49.7 43.2-25.4-15.2 47.8 50-4.2-34.3 36.6 46.8 17.9-46.8 18 34.4 36.5-50-4.2 15.2 47.8-43.2-25.4-7.1 49.7c0-.1-27.9-41.8-27.9-41.8zm0-.8c44.1 0 79.9-35.8 79.9-79.9S300.6 91 256.5 91s-79.9 35.8-79.9 79.9 35.8 79.8 79.9 79.8zM22.8 28.3c0-3.2 2.4-5.7 5.7-5.7h11.3c3.2 0 5.7 2.4 5.7 5.7v11.3c.1 3.1-2.4 5.7-5.6 5.7H28.5c-3.1 0-5.7-2.5-5.7-5.6V28.3zm0 45.7c0-3.2 2.4-5.7 5.7-5.7h11.3c3.2 0 5.7 2.4 5.7 5.7v11.3c.1 3.1-2.4 5.7-5.6 5.7H28.5c-3.1 0-5.7-2.5-5.7-5.6V74zm0 45.6c0-3.2 2.4-5.7 5.7-5.7h11.3c3.2 0 5.7 2.4 5.7 5.7v11.3c.1 3.1-2.4 5.7-5.6 5.7H28.5c-3.1 0-5.7-2.5-5.7-5.6v-11.4zm0 45.6c0-3.2 2.4-5.7 5.7-5.7h11.3c3.2 0 5.7 2.4 5.7 5.7v11.3c.1 3.1-2.4 5.7-5.6 5.7H28.5c-3.1 0-5.7-2.5-5.7-5.6v-11.4zm0 45.7c0-3.2 2.4-5.7 5.7-5.7h11.3c3.2 0 5.7 2.4 5.7 5.7v11.3c.1 3.1-2.4 5.7-5.6 5.7H28.5c-3.1 0-5.7-2.5-5.7-5.6v-11.4zm0 45.6c0-3.2 2.4-5.7 5.7-5.7h11.3c3.2 0 5.7 2.4 5.7 5.7v11.3c.1 3.1-2.4 5.7-5.6 5.7H28.5c-3.1 0-5.7-2.5-5.7-5.6v-11.4zm0 45.6c0-3.2 2.4-5.7 5.7-5.7h11.3c3.2 0 5.7 2.4 5.7 5.7v11.3c.1 3.1-2.4 5.7-5.6 5.7H28.5c-3.1 0-5.7-2.5-5.7-5.6v-11.4zm22.8-22.8c0-3.2 2.4-5.7 5.7-5.7h11.3c3.2 0 5.7 2.4 5.7 5.7v11.3c.1 3.1-2.4 5.7-5.6 5.7H51.3c-3.1 0-5.7-2.5-5.7-5.6v-11.4zm0-45.6c0-3.2 2.4-5.7 5.7-5.7h11.3c3.2 0 5.7 2.4 5.7 5.7V245c.1 3.1-2.4 5.7-5.6 5.7H51.3c-3.1 0-5.7-2.5-5.7-5.6v-11.4zm0-45.7c0-3.2 2.4-5.7 5.7-5.7h11.3c3.2 0 5.7 2.4 5.7 5.7v11.3c.1 3.1-2.4 5.7-5.6 5.7H51.3c-3.1 0-5.7-2.5-5.7-5.6V188zm0-45.6c0-3.2 2.4-5.7 5.7-5.7h11.3c3.2 0 5.7 2.4 5.7 5.7v11.3c.1 3.1-2.4 5.7-5.6 5.7H51.3c-3.1 0-5.7-2.5-5.7-5.6v-11.4zm0-45.6c0-3.2 2.4-5.7 5.7-5.7h11.3c3.2 0 5.7 2.4 5.7 5.7v11.3c.1 3.1-2.4 5.7-5.6 5.7H51.3c-3.1 0-5.7-2.5-5.7-5.6V96.8zm0-45.6c0-3.2 2.4-5.7 5.7-5.7h11.3c3.2 0 5.7 2.4 5.7 5.7v11.3c.1 3.1-2.4 5.7-5.6 5.7H51.3c-3.1 0-5.7-2.5-5.7-5.6V51.2z"/></svg>',
	Россия:
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 513 342"><path fill="#FFF" d="M0 0h513v114H0z"/><path fill="#0039a6" d="M0 114h513v114H0z"/><path fill="#d52b1e" d="M0 228h513v114H0z"/></svg>',
	Беларусь:
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 513 342"><path fill="#007C30" d="M0 0h513v342H0z"/><path fill="#CE1720" d="M0 230h513V0H0"/><path fill="#FFF" d="M100 230V0H0v342h513-413z"/><g fill="#CE1720"><path d="M28 159.6 8.6 128.2 28 97.4l19.3 30.8zM72.6 159.6l-19.3-31.4 19.3-30.8L92 128.2zM28 241.2 8.6 209.8 28 179l19.3 30.8zM72.6 241.2l-19.3-31.4L72.6 179 92 209.8z"/></g><g fill="none" stroke="#CE1720" stroke-width="7"><path d="m28 73.8-16.1-26L28 22.2l16 25.6zM72.6 73.8l-16-26 16-25.6 16.1 25.6zM28 318l-16.1-26.1L28 266.3l16 25.6zM72.6 318l-16-26.1 16-25.6 16.1 25.6z"/></g></svg>',
}

/** Флаг по каноничному названию страны («Казахстан»…). Нет флага — ничего (не буквы). */
function CountryFlag({ country, small = false }: { country: string; small?: boolean }) {
	const svg = FLAG_SVG[country]
	if (!svg) return null
	return (
		// eslint-disable-next-line @next/next/no-img-element
		<img
			src={`data:image/svg+xml,${encodeURIComponent(svg)}`}
			alt=""
			aria-hidden="true"
			// Размер и скругление — как у флага в поле телефона (PhoneInput: w-6 h-4, 3:2)
			className={`${small ? 'w-[15px] h-[10px]' : 'w-6 h-4'} rounded-[2px] shrink-0 object-cover ring-1 ring-black/5 dark:ring-white/10`}
		/>
	)
}

/** Подпись страны: флаг-картинка + название. */
const CountryLabel = ({ country, name, small }: { country: string; name: string; small?: boolean }) => (
	// flex, а не inline-flex: inline-flex внутри строчного span садится на базовую линию
	// текста, и поле со страной выходило на 3px выше соседнего поля города.
	<span className={`flex items-center min-w-0 ${small ? 'gap-1.5' : 'gap-2.5'}`}>
		<CountryFlag
			country={country}
			small={small}
		/>
		<span className="truncate">{name}</span>
	</span>
)

const DROPDOWN_CLS = (upward: boolean) =>
	`absolute ${upward ? 'bottom-full mb-1' : 'top-full mt-1'} left-0 right-0 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg shadow-lg z-50 overflow-hidden`

const OPTION_CLS = (selected: boolean) =>
	`w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between ${
		selected
			? 'bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-300 font-semibold'
			: 'text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800/60'
	}`

export function CitySelect({
	value,
	onChange,
	placeholder,
	required,
	invalid = false,
}: {
	value: string
	onChange: (val: string) => void
	placeholder?: string
	required?: boolean
	invalid?: boolean
}) {
	const { t } = useLang()
	const { open, upward, toggle, setOpen, ref } = useDropdown(260)
	const [custom, setCustom] = useState(() => value !== '' && !ALL_CITIES.includes(value))
	const cities = [
		{ country: 'Казахстан', name: t('cnKZ'), list: CITIES_KZ },
		{ country: 'Россия', name: t('cnRU'), list: CITIES_RU_LIST },
	]
	const selectCity = (city: string) => {
		setCustom(false)
		onChange(city)
		setOpen(false)
	}
	const selectCustom = () => {
		setCustom(true)
		onChange('')
		setOpen(false)
	}
	return (
		<div ref={ref} className="relative flex flex-col gap-2">
			<DropdownTrigger open={open} onClick={toggle} invalid={invalid && !custom}>
				<span className={value || custom ? 'text-slate-900 dark:text-zinc-100' : 'text-slate-400 dark:text-zinc-500'}>
					{custom ? t('otherCity') : value || placeholder || t('selectCity')}
				</span>
			</DropdownTrigger>
			{open && (
				<div className={DROPDOWN_CLS(upward)}>
					<div className="max-h-60 overflow-y-auto">
						{cities.map(({ country, name, list }) => (
							<div key={country}>
								<div className="px-3 py-1.5 text-[10px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider bg-slate-50 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700 sticky top-0">
									<CountryLabel
										country={country}
										name={name}
										small
									/>
								</div>
								{list.map((city) => (
									<button
										key={city}
										type="button"
										onClick={() => selectCity(city)}
										className={OPTION_CLS(value === city && !custom)}>
										{city}
										{value === city && !custom && CHECK}
									</button>
								))}
							</div>
						))}
					</div>
					<div className="border-t border-slate-200 dark:border-zinc-700">
						<button
							type="button"
							onClick={selectCustom}
							className="w-full text-left px-3 py-2 text-sm text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-colors font-medium flex items-center gap-2">
							<Pencil className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
							{t('otherCity')}
						</button>
					</div>
				</div>
			)}
			{custom && (
				<input
					type="text"
					value={value}
					onChange={(e) => onChange(e.target.value)}
					placeholder={t('enterCityManually')}
					autoFocus
					required={required}
					className={`w-full px-3 py-2 bg-white dark:bg-zinc-800 border rounded-lg text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 transition-all text-sm font-medium ${
						invalid && !value
							? 'border-red-400 focus:border-red-500 focus:ring-red-500/10'
							: 'border-slate-200 dark:border-zinc-700 focus:border-orange-500 focus:ring-orange-500/10'
					}`}
				/>
			)}
			{required && !custom && (
				<input
					tabIndex={-1}
					required
					value={value}
					onChange={() => {}}
					className="absolute opacity-0 h-0 w-0 pointer-events-none"
				/>
			)}
		</div>
	)
}

export function CountrySelect({
	value,
	onChange,
	placeholder,
	required,
	invalid = false,
}: {
	value: string
	onChange: (val: string) => void
	placeholder?: string
	required?: boolean
	invalid?: boolean
}) {
	const { t } = useLang()
	const { open, upward, toggle, setOpen, ref } = useDropdown(170)
	// value хранится в каноничном виде («Казахстан»/«Россия»), label — переведённое название;
	// флаг рисуется картинкой рядом (CountryFlag), а не эмодзи в подписи.
	const countries = [
		{ value: 'Казахстан', label: t('cnKZ') },
		{ value: 'Россия', label: t('cnRU') },
		{ value: 'Беларусь', label: t('cnBY') },
	]
	const [custom, setCustom] = useState(() => value !== '' && !countries.some((c) => c.value === value))
	const selectedLabel = countries.find((c) => c.value === value)?.label
	const selectCountry = (c: string) => {
		setCustom(false)
		onChange(c)
		setOpen(false)
	}
	const selectCustom = () => {
		setCustom(true)
		onChange('')
		setOpen(false)
	}
	return (
		<div ref={ref} className="relative flex flex-col gap-2">
			<DropdownTrigger open={open} onClick={toggle} invalid={invalid && !custom}>
				<span className={`flex min-w-0 ${value || custom ? 'text-slate-900 dark:text-zinc-100' : 'text-slate-400 dark:text-zinc-500'}`}>
					{custom ? (
						t('otherCountry')
					) : selectedLabel ? (
						<CountryLabel
							country={value}
							name={selectedLabel}
						/>
					) : (
						value || placeholder || t('selectCountry')
					)}
				</span>
			</DropdownTrigger>
			{open && (
				<div className={DROPDOWN_CLS(upward)}>
					{countries.map((c) => (
						<button
							key={c.value}
							type="button"
							onClick={() => selectCountry(c.value)}
							className={OPTION_CLS(value === c.value && !custom)}>
							<CountryLabel
								country={c.value}
								name={c.label}
							/>
							{value === c.value && !custom && CHECK}
						</button>
					))}
					<div className="border-t border-slate-200 dark:border-zinc-700">
						<button
							type="button"
							onClick={selectCustom}
							className="w-full text-left px-3 py-2 text-sm text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-colors font-medium flex items-center gap-2">
							<Pencil className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
							{t('otherCountry')}
						</button>
					</div>
				</div>
			)}
			{custom && (
				<input
					type="text"
					value={value}
					onChange={(e) => onChange(e.target.value)}
					placeholder={t('enterCountryManually')}
					autoFocus
					required={required}
					className={`w-full px-3 py-2 bg-white dark:bg-zinc-800 border rounded-lg text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 transition-all text-sm font-medium ${
						invalid && !value
							? 'border-red-400 focus:border-red-500 focus:ring-red-500/10'
							: 'border-slate-200 dark:border-zinc-700 focus:border-orange-500 focus:ring-orange-500/10'
					}`}
				/>
			)}
		</div>
	)
}

export function StatusSelect({ value, onChange }: { value: string; onChange: (val: string) => void }) {
	const { t } = useLang()
	const { open, upward, toggle, setOpen, ref } = useDropdown(130)
	const options = [
		{ value: 'ожидает отправления', label: t('statusOptionWaiting') },
		{ value: 'в пути', label: t('statusOptionInTransit') },
		{ value: 'прибыл', label: t('statusOptionArrived') },
	]
	const selected = options.find((o) => o.value === value)
	return (
		<div ref={ref} className="relative">
			<DropdownTrigger open={open} onClick={toggle}>
				<span className="text-slate-900 dark:text-zinc-100">{selected?.label}</span>
			</DropdownTrigger>
			{open && (
				<div className={DROPDOWN_CLS(upward)}>
					{options.map((opt) => (
						<button
							key={opt.value}
							type="button"
							onClick={() => {
								onChange(opt.value)
								setOpen(false)
							}}
							className={OPTION_CLS(value === opt.value)}>
							{opt.label}
							{value === opt.value && CHECK}
						</button>
					))}
				</div>
			)}
		</div>
	)
}

export function PaymentSelect({ value, onChange }: { value: string; onChange: (val: string) => void }) {
	const { t } = useLang()
	const { open, upward, toggle, setOpen, ref } = useDropdown(130)
	const options = [
		{ value: 'none', label: t('paymentNone') },
		{ value: 'partial', label: t('paymentPartial') },
		{ value: 'full', label: t('paymentFull') },
	]
	const selected = options.find((o) => o.value === value) || options[0]
	return (
		<div ref={ref} className="relative">
			<DropdownTrigger open={open} onClick={toggle}>
				<span className="text-slate-900 dark:text-zinc-100">{selected.label}</span>
			</DropdownTrigger>
			{open && (
				<div className={DROPDOWN_CLS(upward)}>
					{options.map((opt) => (
						<button
							key={opt.value}
							type="button"
							onClick={() => {
								onChange(opt.value)
								setOpen(false)
							}}
							className={OPTION_CLS(value === opt.value)}>
							{opt.label}
							{value === opt.value && CHECK}
						</button>
					))}
				</div>
			)}
		</div>
	)
}

export function CurrencySelect({ value, onChange }: { value: string; onChange: (val: string) => void }) {
	const { t } = useLang()
	const { open, upward, toggle, setOpen, ref } = useDropdown(90)
	const options = [
		{ value: 'KZT', label: t('currencyKZT') },
		{ value: 'RUB', label: t('currencyRUB') },
	]
	const selected = options.find((o) => o.value === value) || options[0]
	return (
		<div ref={ref} className="relative">
			<DropdownTrigger open={open} onClick={toggle}>
				<span className="text-slate-900 dark:text-zinc-100">{selected.label}</span>
			</DropdownTrigger>
			{open && (
				<div className={DROPDOWN_CLS(upward)}>
					{options.map((opt) => (
						<button
							key={opt.value}
							type="button"
							onClick={() => {
								onChange(opt.value)
								setOpen(false)
							}}
							className={OPTION_CLS(value === opt.value)}>
							{opt.label}
							{value === opt.value && CHECK}
						</button>
					))}
				</div>
			)}
		</div>
	)
}
