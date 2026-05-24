'use client'

import { memo, useState } from 'react'
import { useLang } from '@/contexts/LangContext'
import { getCurrencySymbol } from '@/lib/format'
import { INPUT_CLS } from './constants'
import { CitySelect, StatusSelect, PaymentSelect, CurrencySelect } from './Selects'
import { DatePickerField } from './DatePickerField'
import { TimeframeInput } from './TimeframeInput'
import { Spinner } from '@/components/Spinner'

interface NewCargoFormProps {
	onCreated: () => Promise<void>
	addToast: (message: string, type?: 'success' | 'error') => void
	wide?: boolean
}

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
	<p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">{children}</p>
)

const Label = ({ children }: { children: React.ReactNode }) => (
	<label className="text-xs font-medium text-slate-700 mb-1.5 block">{children}</label>
)

export const NewCargoForm = memo(function NewCargoForm({ onCreated, addToast, wide }: NewCargoFormProps) {
	const { t, tf } = useLang()
	const [fromCity, setFromCity] = useState('')
	const [toCity, setToCity] = useState('')
	const [cargoNumber, setCargoNumber] = useState('')
	const [cargoName, setCargoName] = useState('')
	const [status, setStatus] = useState('ожидает отправления')
	const [acceptanceDate, setAcceptanceDate] = useState('')
	const [shipmentDate, setShipmentDate] = useState('')
	const [deliveryTimeframe, setDeliveryTimeframe] = useState('')
	const [deliveryAmount, setDeliveryAmount] = useState('')
	const [paymentStatus, setPaymentStatus] = useState('none')
	const [partialPaymentDetail, setPartialPaymentDetail] = useState('')
	const [currency, setCurrency] = useState('KZT')
	const [loading, setLoading] = useState(false)

	const canSubmit = fromCity.trim().length > 0 && toCity.trim().length > 0

	const generateId = () => 'CARGO-' + Date.now() + '-' + Math.random().toString(36).slice(2, 11).toUpperCase()

	const handleSubmit = async (e: React.SyntheticEvent) => {
		e.preventDefault()
		if (!fromCity.trim() || !toCity.trim()) {
			addToast(t('fillAllFields'), 'error')
			return
		}
		setLoading(true)
		try {
			const normalizedId = generateId().toUpperCase().trim()
			const res = await fetch('/api/cargos', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: normalizedId,
					cargoNumber: cargoNumber.trim() ? Number(cargoNumber.trim()) : null,
					name: cargoName.trim() || null,
					fromCity: fromCity.trim(),
					currentCity: fromCity.trim(),
					toCity: toCity.trim(),
					status,
					acceptanceDate: acceptanceDate || null,
					shipmentDate: shipmentDate || null,
					deliveryTimeframe: deliveryTimeframe || null,
					deliveryAmount: deliveryAmount ? Number(deliveryAmount) : null,
					paymentStatus,
					partialPaymentDetail: paymentStatus === 'partial' ? partialPaymentDetail || null : null,
					currency,
				}),
			})
			if (!res.ok) throw new Error()
			addToast(tf('cargoCreated', { id: normalizedId }), 'success')
			setFromCity('')
			setToCity('')
			setCargoNumber('')
			setCargoName('')
			setStatus('ожидает отправления')
			setAcceptanceDate('')
			setShipmentDate('')
			setDeliveryTimeframe('')
			setDeliveryAmount('')
			setPaymentStatus('none')
			setPartialPaymentDetail('')
			setCurrency('KZT')
			await onCreated()
		} catch {
			addToast(t('createError'), 'error')
		} finally {
			setLoading(false)
		}
	}

	const formBody = (
		<form onSubmit={handleSubmit} className="flex flex-col gap-6">
			{/* Route */}
			<div>
				<SectionTitle>Маршрут</SectionTitle>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div>
						<Label>{t('fromFormLabel')}</Label>
						<CitySelect value={fromCity} onChange={setFromCity} placeholder={t('cityDeparture')} required />
					</div>
					<div>
						<Label>{t('toFormLabel')}</Label>
						<CitySelect value={toCity} onChange={setToCity} placeholder={t('cityDelivery')} required />
					</div>
				</div>
			</div>

			{/* Info */}
			<div>
				<SectionTitle>Информация</SectionTitle>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div>
						<Label>{t('cargoNumberLabel')}</Label>
						<input
							type="number"
							min="0"
							step="1"
							value={cargoNumber}
							onChange={(e) => setCargoNumber(e.target.value)}
							placeholder={t('enterCargoNumber')}
							className={INPUT_CLS}
						/>
					</div>
					<div>
						<Label>{t('cargoNameLabel')}</Label>
						<input
							type="text"
							value={cargoName}
							onChange={(e) => setCargoName(e.target.value)}
							placeholder={t('enterName')}
							className={INPUT_CLS}
						/>
					</div>
					<div className="sm:col-span-2">
						<Label>{t('statusFormLabel')}</Label>
						<StatusSelect value={status} onChange={setStatus} />
					</div>
				</div>
			</div>

			{/* Dates */}
			<div>
				<SectionTitle>Даты</SectionTitle>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div>
						<Label>{t('acceptanceDateLabel')}</Label>
						<DatePickerField value={acceptanceDate} onChange={setAcceptanceDate} />
					</div>
					<div>
						<Label>{t('shipmentDateLabel')}</Label>
						<DatePickerField value={shipmentDate} onChange={setShipmentDate} />
					</div>
				</div>
			</div>

			{/* Payment */}
			<div>
				<SectionTitle>Оплата и доставка</SectionTitle>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div>
						<Label>{t('deliveryTimeframeLabel')}</Label>
						<TimeframeInput value={deliveryTimeframe} onChange={setDeliveryTimeframe} />
					</div>
					<div>
						<Label>{t('deliveryAmountLabel')}</Label>
						<div className="flex gap-2">
							<input
								type="number"
								min="0"
								value={deliveryAmount}
								onChange={(e) => setDeliveryAmount(e.target.value)}
								placeholder={t('enterAmount')}
								className={`${INPUT_CLS} flex-1 min-w-0`}
							/>
							<div className="w-36 shrink-0">
								<CurrencySelect value={currency} onChange={setCurrency} />
							</div>
						</div>
					</div>
					<div>
						<Label>{t('paymentStatusLabel')}</Label>
						<PaymentSelect value={paymentStatus} onChange={setPaymentStatus} />
					</div>
					{paymentStatus === 'partial' && (
						<div>
							<Label>{t('partialPaymentDetailLabel')}</Label>
							<div className="flex items-center gap-2">
								<input
									type="number"
									min="0"
									value={partialPaymentDetail}
									onChange={(e) => setPartialPaymentDetail(e.target.value)}
									placeholder={t('enterAmount')}
									className={`${INPUT_CLS} flex-1`}
								/>
								<span className="text-slate-500 text-sm font-medium shrink-0">{getCurrencySymbol(currency)}</span>
							</div>
						</div>
					)}
				</div>
			</div>

			<div className="pt-2">
				<button
					type="submit"
					disabled={!canSubmit || loading}
					className="w-full inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm">
					{loading ? (
						<>
							<Spinner className="w-4 h-4 text-white" />
							{t('creating')}
						</>
					) : (
						t('createCargoButton')
					)}
				</button>
				{!canSubmit && !loading && (
					<p className="text-xs text-slate-500 text-center mt-2">
						{!fromCity.trim() && !toCity.trim()
							? t('createHintBoth')
							: !fromCity.trim()
								? t('createHintFrom')
								: t('createHintTo')}
					</p>
				)}
			</div>
		</form>
	)

	return (
		<div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 sm:p-6">
			{!wide && (
				<div className="flex items-center gap-2 mb-5">
					<h2 className="text-lg font-semibold text-slate-900">{t('newCargoTitle')}</h2>
				</div>
			)}
			{formBody}
		</div>
	)
})
