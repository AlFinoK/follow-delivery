'use client'

import { memo, useState } from 'react'
import { useLang } from '@/contexts/LangContext'
import { formatDate, toInputDate, getCurrencySymbol, displayTimeframe } from '@/lib/format'
import { EDIT_INPUT_CLS } from './constants'
import { CitySelect, StatusSelect, PaymentSelect, CurrencySelect } from './Selects'
import { DatePickerField } from './DatePickerField'
import { TimeframeInput } from './TimeframeInput'
import { EditActions } from './EditActions'
import type { CargoCardProps } from './types'

export const CargoCard = memo(function CargoCard({
	cargo,
	isCopied,
	onCopy,
	onUpdateStatus,
	onUpdateCurrentCity,
	onUpdateName,
	onUpdateField,
	onUpdatePaymentStatus,
	onUpdateCurrency,
	onDelete,
}: CargoCardProps) {
	const { t } = useLang()
	const [editingCity, setEditingCity] = useState(false)
	const [editingCityValue, setEditingCityValue] = useState('')
	const [editingName, setEditingName] = useState(false)
	const [editingNameValue, setEditingNameValue] = useState('')
	const [editingField, setEditingField] = useState<{ field: string; value: string } | null>(null)

	const startEditField = (field: string, value: string) => setEditingField({ field, value })
	const isEditing = (field: string) => editingField?.field === field

	const saveCity = async () => {
		if (editingCityValue.trim() === cargo.currentCity) {
			setEditingCity(false)
			setEditingCityValue('')
			return
		}
		try {
			await onUpdateCurrentCity(cargo.docId, editingCityValue)
			setEditingCity(false)
			setEditingCityValue('')
		} catch {
			/* toast shown by parent */
		}
	}

	const saveName = async () => {
		if ((cargo.name ?? '') === editingNameValue.trim()) {
			setEditingName(false)
			setEditingNameValue('')
			return
		}
		try {
			await onUpdateName(cargo.docId, editingNameValue)
			setEditingName(false)
			setEditingNameValue('')
		} catch {
			/* toast shown by parent */
		}
	}

	const saveField = async () => {
		if (!editingField) return
		try {
			await onUpdateField(cargo.docId, editingField.field, editingField.value)
			setEditingField(null)
		} catch {
			/* toast shown by parent */
		}
	}

	const currencySymbol = getCurrencySymbol(cargo.currency || 'KZT')

	return (
		<div className="bg-gray-50 rounded-xl p-5 sm:p-6 border border-orange-100 hover:shadow-md transition-all">

			{/* NAME */}
			<div className="mb-4 pb-4 border-b border-orange-100">
				<p className="text-orange-600 text-xs font-bold mb-2">{t('cargoNameCardLabel')}</p>
				{editingName ? (
					<div className="flex flex-col gap-2">
						<input
							type="text"
							value={editingNameValue}
							onChange={(e) => setEditingNameValue(e.target.value)}
							placeholder={t('enterName')}
							autoFocus
							className={EDIT_INPUT_CLS}
						/>
						<EditActions
							onSave={saveName}
							onCancel={() => {
								setEditingName(false)
								setEditingNameValue('')
							}}
						/>
					</div>
				) : (
					<button
						onClick={() => {
							setEditingName(true)
							setEditingNameValue(cargo.name ?? '')
						}}
						className="w-full text-left text-gray-900 font-semibold text-sm hover:text-orange-600 transition-colors px-3 py-2 bg-white border-2 border-orange-200 rounded-lg hover:border-orange-300">
						{cargo.name ? (
							<span>
								{cargo.name} <span className="text-orange-400">✎</span>
							</span>
						) : (
							<span className="text-gray-400 italic">
								{t('noName')} <span className="text-orange-400 not-italic">✎</span>
							</span>
						)}
					</button>
				)}
			</div>

			{/* TRACK */}
			<div className="mb-4 pb-4 border-b border-orange-100">
				<p className="text-orange-600 text-xs font-bold mb-2">{t('trackCardLabel')}</p>
				<button
					onClick={() => onCopy(cargo.id)}
					className={`w-full px-3 py-2 rounded-lg font-mono text-xs sm:text-sm break-all transition-all ${
						isCopied ? 'bg-emerald-500 text-white' : 'bg-white border-2 border-orange-200 text-gray-900 hover:bg-orange-50'
					}`}>
					{isCopied ? t('copied') : cargo.id}
				</button>
			</div>

			{/* ROUTE */}
			<div className="mb-4 pb-4 border-b border-orange-100 space-y-3">
				<div className="flex items-start gap-2">
					<span className="text-lg flex-shrink-0">📤</span>
					<div className="flex-1 min-w-0">
						<p className="text-orange-600 text-xs font-bold">{t('fromCardLabel')}</p>
						<p className="text-gray-900 font-semibold text-sm truncate">{cargo.fromCity}</p>
					</div>
				</div>
				<div className="flex items-start gap-2">
					<span className="text-lg flex-shrink-0">📍</span>
					<div className="flex-1 min-w-0">
						<p className="text-orange-600 text-xs font-bold">{t('currentLocationLabel')}</p>
						{editingCity ? (
							<div className="mt-1 flex flex-col gap-2">
								<CitySelect value={editingCityValue} onChange={setEditingCityValue} placeholder={t('selectCity')} />
								<EditActions
									onSave={saveCity}
									onCancel={() => {
										setEditingCity(false)
										setEditingCityValue('')
									}}
								/>
							</div>
						) : (
							<button
								onClick={() => {
									setEditingCity(true)
									setEditingCityValue(cargo.currentCity)
								}}
								className="text-gray-900 font-semibold text-sm hover:text-orange-600 transition-colors mt-1 block">
								{cargo.currentCity} <span className="text-orange-400">✎</span>
							</button>
						)}
					</div>
				</div>
				<div className="flex items-start gap-2">
					<span className="text-lg flex-shrink-0">📥</span>
					<div className="flex-1 min-w-0">
						<p className="text-orange-600 text-xs font-bold">{t('toCardLabel')}</p>
						<p className="text-gray-900 font-semibold text-sm truncate">{cargo.toCity}</p>
					</div>
				</div>
			</div>

			{/* DETAILS */}
			<div className="mb-4 pb-4 border-b border-orange-100">
				<p className="text-orange-600 text-xs font-bold mb-3">{t('detailsLabel')}</p>
				<div className="space-y-3">

					{/* Acceptance Date */}
					<div className="flex items-start gap-2">
						<span className="text-sm flex-shrink-0 mt-0.5">📅</span>
						<div className="flex-1 min-w-0">
							<p className="text-orange-600 text-xs font-bold">{t('acceptanceDateLabel')}</p>
							{isEditing('acceptanceDate') ? (
								<div className="mt-1">
									<DatePickerField
										value={editingField!.value}
										onChange={(v) => setEditingField({ field: 'acceptanceDate', value: v })}
									/>
									<EditActions onSave={saveField} onCancel={() => setEditingField(null)} />
								</div>
							) : (
								<button
									onClick={() => startEditField('acceptanceDate', toInputDate(cargo.acceptanceDate))}
									className="text-gray-900 font-semibold text-sm hover:text-orange-600 transition-colors mt-0.5 block">
									{cargo.acceptanceDate ? (
										<span>
											{formatDate(cargo.acceptanceDate)} <span className="text-orange-400">✎</span>
										</span>
									) : (
										<span className="text-gray-400 italic">
											{t('notSpecified')} <span className="text-orange-400 not-italic">✎</span>
										</span>
									)}
								</button>
							)}
						</div>
					</div>

					{/* Shipment Date */}
					<div className="flex items-start gap-2">
						<span className="text-sm flex-shrink-0 mt-0.5">🚀</span>
						<div className="flex-1 min-w-0">
							<p className="text-orange-600 text-xs font-bold">{t('shipmentDateLabel')}</p>
							{isEditing('shipmentDate') ? (
								<div className="mt-1">
									<DatePickerField
										value={editingField!.value}
										onChange={(v) => setEditingField({ field: 'shipmentDate', value: v })}
									/>
									<EditActions onSave={saveField} onCancel={() => setEditingField(null)} />
								</div>
							) : (
								<button
									onClick={() => startEditField('shipmentDate', toInputDate(cargo.shipmentDate))}
									className="text-gray-900 font-semibold text-sm hover:text-orange-600 transition-colors mt-0.5 block">
									{cargo.shipmentDate ? (
										<span>
											{formatDate(cargo.shipmentDate)} <span className="text-orange-400">✎</span>
										</span>
									) : (
										<span className="text-gray-400 italic">
											{t('notSpecified')} <span className="text-orange-400 not-italic">✎</span>
										</span>
									)}
								</button>
							)}
						</div>
					</div>

					{/* Delivery Timeframe */}
					<div className="flex items-start gap-2">
						<span className="text-sm flex-shrink-0 mt-0.5">🕐</span>
						<div className="flex-1 min-w-0">
							<p className="text-orange-600 text-xs font-bold">{t('deliveryTimeframeLabel')}</p>
							{isEditing('deliveryTimeframe') ? (
								<div className="mt-1">
									<TimeframeInput
										value={editingField!.value}
										onChange={(v) => setEditingField({ field: 'deliveryTimeframe', value: v })}
									/>
									<EditActions onSave={saveField} onCancel={() => setEditingField(null)} />
								</div>
							) : (
								<button
									onClick={() => startEditField('deliveryTimeframe', cargo.deliveryTimeframe || '')}
									className="text-gray-900 font-semibold text-sm hover:text-orange-600 transition-colors mt-0.5 block">
									{cargo.deliveryTimeframe ? (
										<span>
											{displayTimeframe(cargo.deliveryTimeframe, t)} <span className="text-orange-400">✎</span>
										</span>
									) : (
										<span className="text-gray-400 italic">
											{t('notSpecified')} <span className="text-orange-400 not-italic">✎</span>
										</span>
									)}
								</button>
							)}
						</div>
					</div>

					{/* Delivery Amount */}
					<div className="flex items-start gap-2">
						<span className="text-sm flex-shrink-0 mt-0.5">💰</span>
						<div className="flex-1 min-w-0">
							<p className="text-orange-600 text-xs font-bold">{t('deliveryAmountLabel')}</p>
							{isEditing('deliveryAmount') ? (
								<div className="mt-1">
									<div className="flex items-center gap-2">
										<input
											type="number"
											min="0"
											value={editingField!.value}
											onChange={(e) => setEditingField({ field: 'deliveryAmount', value: e.target.value })}
											placeholder={t('enterAmount')}
											autoFocus
											className={`${EDIT_INPUT_CLS} flex-1`}
										/>
										<span className="text-gray-500 text-base font-bold flex-shrink-0">{currencySymbol}</span>
									</div>
									<EditActions onSave={saveField} onCancel={() => setEditingField(null)} />
								</div>
							) : (
								<button
									onClick={() => startEditField('deliveryAmount', cargo.deliveryAmount?.toString() ?? '')}
									className="text-gray-900 font-semibold text-sm hover:text-orange-600 transition-colors mt-0.5 block">
									{cargo.deliveryAmount != null ? (
										<span>
											{cargo.deliveryAmount.toLocaleString()} {currencySymbol} <span className="text-orange-400">✎</span>
										</span>
									) : (
										<span className="text-gray-400 italic">
											{t('notSpecified')} <span className="text-orange-400 not-italic">✎</span>
										</span>
									)}
								</button>
							)}
						</div>
					</div>

					{/* Currency */}
					<div className="flex items-start gap-2">
						<span className="text-sm flex-shrink-0 mt-0.5">💱</span>
						<div className="flex-1 min-w-0">
							<p className="text-orange-600 text-xs font-bold mb-1">{t('currencyLabel')}</p>
							<CurrencySelect value={cargo.currency || 'KZT'} onChange={(v) => onUpdateCurrency(cargo.docId, v)} />
						</div>
					</div>

					{/* Payment Status */}
					<div className="flex items-start gap-2">
						<span className="text-sm flex-shrink-0 mt-0.5">💳</span>
						<div className="flex-1 min-w-0">
							<p className="text-orange-600 text-xs font-bold mb-1">{t('paymentStatusLabel')}</p>
							<PaymentSelect value={cargo.paymentStatus || 'none'} onChange={(v) => onUpdatePaymentStatus(cargo.docId, v)} />
						</div>
					</div>

					{/* Partial Payment Detail */}
					{cargo.paymentStatus === 'partial' && (
						<div className="flex items-start gap-2 pl-6">
							<div className="flex-1 min-w-0">
								<p className="text-orange-600 text-xs font-bold">{t('partialPaymentDetailLabel')}</p>
								{isEditing('partialPaymentDetail') ? (
									<div className="mt-1">
										<div className="flex items-center gap-2">
											<input
												type="number"
												min="0"
												value={editingField!.value}
												onChange={(e) => setEditingField({ field: 'partialPaymentDetail', value: e.target.value })}
												placeholder={t('enterAmount')}
												autoFocus
												className={`${EDIT_INPUT_CLS} flex-1`}
											/>
											<span className="text-gray-500 text-base font-bold flex-shrink-0">{currencySymbol}</span>
										</div>
										<EditActions onSave={saveField} onCancel={() => setEditingField(null)} />
									</div>
								) : (
									<button
										onClick={() => startEditField('partialPaymentDetail', cargo.partialPaymentDetail ?? '')}
										className="text-gray-900 font-semibold text-sm hover:text-orange-600 transition-colors mt-0.5 block">
										{cargo.partialPaymentDetail ? (
											<span>
												{!isNaN(Number(cargo.partialPaymentDetail))
													? Number(cargo.partialPaymentDetail).toLocaleString()
													: cargo.partialPaymentDetail}{' '}
												{currencySymbol} <span className="text-orange-400">✎</span>
											</span>
										) : (
											<span className="text-gray-400 italic">
												{t('notSpecified')} <span className="text-orange-400 not-italic">✎</span>
											</span>
										)}
									</button>
								)}
							</div>
						</div>
					)}
				</div>
			</div>

			{/* STATUS */}
			<div className="mb-4">
				<p className="text-orange-600 text-xs font-bold mb-2">{t('statusCardLabel')}</p>
				<StatusSelect value={cargo.status} onChange={(v) => onUpdateStatus(cargo.docId, v)} />
			</div>

			{/* DELETE */}
			<button
				onClick={() => onDelete(cargo.docId)}
				className="w-full bg-red-600/80 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all">
				{t('deleteButton')}
			</button>
		</div>
	)
})
