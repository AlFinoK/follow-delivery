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

	const Label = ({ children }: { children: React.ReactNode }) => (
		<label className="text-orange-600 text-xs font-bold mb-2 block tracking-wide">{children}</label>
	)

	if (wide) {
		return (
			<div className="bg-white rounded-2xl shadow-lg border border-orange-100 p-4 sm:p-8">
				<form onSubmit={handleSubmit} className="flex flex-col gap-6">
					{/* Route row */}
					<div>
						<p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Маршрут</p>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

					{/* Info row */}
					<div>
						<p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Информация</p>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
							<div>
								<Label>{t('statusFormLabel')}</Label>
								<StatusSelect value={status} onChange={setStatus} />
							</div>
						</div>
					</div>

					{/* Dates row */}
					<div>
						<p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Даты</p>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

					{/* Payment row */}
					<div>
						<p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Оплата и доставка</p>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
									<div className="w-36 flex-shrink-0">
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
										<span className="text-gray-500 text-base font-bold flex-shrink-0">{getCurrencySymbol(currency)}</span>
									</div>
								</div>
							)}
						</div>
					</div>

					<div>
						<button
							type="submit"
							disabled={!canSubmit || loading}
							className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-3.5 rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm sm:text-base mt-1">
							{loading ? (
								<span className="flex items-center justify-center gap-2">
									<Spinner />
									{t('creating')}
								</span>
							) : (
								t('createCargoButton')
							)}
						</button>
						{!canSubmit && !loading && (
							<p className="text-xs text-orange-400 text-center mt-2">
								{!fromCity.trim() && !toCity.trim()
									? t('createHintBoth')
									: !fromCity.trim()
									? t('createHintFrom')
									: t('createHintTo')}
							</p>
						)}
					</div>
				</form>
			</div>
		)
	}

	return (
		<div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 border border-orange-100">
			<div className="flex items-center gap-3 mb-6 sm:mb-8">
				<span className="text-2xl sm:text-3xl">➕</span>
				<h2 className="text-xl sm:text-2xl font-black text-gray-900">{t('newCargoTitle')}</h2>
			</div>
			<form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:gap-5">
				<div>
					<Label>{t('fromFormLabel')}</Label>
					<CitySelect value={fromCity} onChange={setFromCity} placeholder={t('cityDeparture')} required />
				</div>
				<div>
					<Label>{t('toFormLabel')}</Label>
					<CitySelect value={toCity} onChange={setToCity} placeholder={t('cityDelivery')} required />
				</div>
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
				<div>
					<Label>{t('statusFormLabel')}</Label>
					<StatusSelect value={status} onChange={setStatus} />
				</div>
				<div>
					<Label>{t('acceptanceDateLabel')}</Label>
					<DatePickerField value={acceptanceDate} onChange={setAcceptanceDate} />
				</div>
				<div>
					<Label>{t('shipmentDateLabel')}</Label>
					<DatePickerField value={shipmentDate} onChange={setShipmentDate} />
				</div>
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
							className={`${INPUT_CLS} flex-1`}
						/>
						<div className="w-40 flex-shrink-0">
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
							<span className="text-gray-500 text-base font-bold flex-shrink-0">{getCurrencySymbol(currency)}</span>
						</div>
					</div>
				)}
				<div>
					<button
						type="submit"
						disabled={!canSubmit || loading}
						className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-3 sm:py-4 rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm sm:text-base">
						{loading ? (
							<span className="flex items-center justify-center gap-2">
								<Spinner />
								{t('creating')}
							</span>
						) : (
							t('createCargoButton')
						)}
					</button>
					{!canSubmit && !loading && (
						<p className="text-xs text-orange-400 text-center mt-2">
							{!fromCity.trim() && !toCity.trim()
								? t('createHintBoth')
								: !fromCity.trim()
								? t('createHintFrom')
								: t('createHintTo')}
						</p>
					)}
				</div>
			</form>
		</div>
	)
})
