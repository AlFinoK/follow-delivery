'use client'

import { useState } from 'react'
import { useLang } from '@/contexts/LangContext'
import { useDropdown } from './useDropdown'
import { DropdownTrigger } from './DropdownTrigger'

const CITIES_KZ = ['Алматы', 'Астана', 'Шымкент', 'Актобе', 'Тараз', 'Павлодар', 'Усть-Каменогорск']
const CITIES_RU_LIST = ['Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Казань', 'Омск', 'Самара', 'Уфа']
const ALL_CITIES = [...CITIES_KZ, ...CITIES_RU_LIST]

const CHECK = (
	<svg className="w-4 h-4 text-orange-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
		<path
			fillRule="evenodd"
			d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
			clipRule="evenodd"
		/>
	</svg>
)

const DROPDOWN_CLS = (upward: boolean) =>
	`absolute ${upward ? 'bottom-full mb-1' : 'top-full mt-1'} left-0 right-0 bg-white border border-orange-100 rounded-xl shadow-xl z-50 overflow-hidden`

export function CitySelect({
	value,
	onChange,
	placeholder,
	required,
}: {
	value: string
	onChange: (val: string) => void
	placeholder?: string
	required?: boolean
}) {
	const { t } = useLang()
	const { open, upward, toggle, setOpen, ref } = useDropdown(260)
	const [custom, setCustom] = useState(() => value !== '' && !ALL_CITIES.includes(value))
	const cities = [
		{ name: t('countryKZ'), list: CITIES_KZ },
		{ name: t('countryRU'), list: CITIES_RU_LIST },
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
			<DropdownTrigger open={open} onClick={toggle}>
				<span className={value || custom ? 'text-gray-900' : 'text-gray-400'}>
					{custom ? t('otherCity') : value || placeholder || t('selectCity')}
				</span>
			</DropdownTrigger>
			{open && (
				<div className={DROPDOWN_CLS(upward)}>
					<div className="max-h-60 overflow-y-auto">
						{cities.map(({ name, list }) => (
							<div key={name}>
								<div className="px-3 py-2 text-[10px] font-black text-orange-400 uppercase tracking-widest bg-orange-50 border-b border-orange-100 sticky top-0">
									{name}
								</div>
								{list.map((city) => (
									<button
										key={city}
										type="button"
										onClick={() => selectCity(city)}
										className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${
											value === city && !custom
												? 'bg-orange-50 text-orange-600 font-semibold'
												: 'text-gray-700 hover:bg-orange-50 hover:text-orange-600'
										}`}>
										{city}
										{value === city && !custom && CHECK}
									</button>
								))}
							</div>
						))}
					</div>
					<div className="border-t border-orange-100">
						<button
							type="button"
							onClick={selectCustom}
							className="w-full text-left px-4 py-2.5 text-sm text-orange-500 hover:bg-orange-50 transition-colors font-medium">
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
					className="w-full px-4 py-3 bg-white border-2 border-orange-400 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-400/30 transition-all text-sm font-medium"
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
				<span className="text-gray-900">{selected?.label}</span>
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
							className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${
								value === opt.value ? 'bg-orange-50 text-orange-600 font-semibold' : 'text-gray-700 hover:bg-orange-50 hover:text-orange-600'
							}`}>
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
				<span className="text-gray-900">{selected.label}</span>
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
							className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${
								value === opt.value ? 'bg-orange-50 text-orange-600 font-semibold' : 'text-gray-700 hover:bg-orange-50 hover:text-orange-600'
							}`}>
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
				<span className="text-gray-900">{selected.label}</span>
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
							className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${
								value === opt.value ? 'bg-orange-50 text-orange-600 font-semibold' : 'text-gray-700 hover:bg-orange-50 hover:text-orange-600'
							}`}>
							{opt.label}
							{value === opt.value && CHECK}
						</button>
					))}
				</div>
			)}
		</div>
	)
}
