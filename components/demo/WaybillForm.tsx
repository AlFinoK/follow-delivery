'use client'

import { Plus, Trash2, User, UserRound, PackageOpen, Wallet, CalendarDays, Info } from 'lucide-react'
import { DecimalInput } from '@/components/calculator/DecimalInput'
import { DatePickerField } from '@/components/admin/DatePickerField'
import { Select } from '@/components/demo/Select'
import {
	INSTRUCTION_HINTS,
	NATURE_PRESETS,
	STATUS_LABELS,
	autoVolume,
	emptyPosition,
	fmtDecimal,
	totalWeight,
	type Position,
	type Waybill,
	type WaybillStatus,
} from '@/lib/demo/waybill'

// ── Общие поля (комфортные размеры под прод) ────────────────────────────────
const FIELD =
	'w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-300 text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all'

const Label = ({ children, req }: { children: React.ReactNode; req?: boolean }) => (
	<label className="text-[13px] font-medium text-slate-700 mb-1.5 block">
		{children}
		{req && <span className="text-orange-500"> *</span>}
	</label>
)

// Секция формы с иконкой, заголовком и разделителем сверху.
function Section({
	icon: Icon,
	title,
	hint,
	children,
}: {
	icon: typeof User
	title: string
	hint?: string
	children: React.ReactNode
}) {
	return (
		<section className="pt-7 first:pt-0 border-t border-slate-100 first:border-t-0">
			<div className="flex items-center gap-3 mb-4">
				<span className="w-9 h-9 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
					<Icon className="w-[18px] h-[18px]" />
				</span>
				<div className="min-w-0">
					<h3 className="text-[15px] font-semibold text-slate-900 leading-tight">{title}</h3>
					{hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
				</div>
			</div>
			{children}
		</section>
	)
}

function Radio<T extends string>({
	value,
	onChange,
	options,
	disabled,
}: {
	value: T
	onChange: (v: T) => void
	options: { value: T; label: string }[]
	disabled?: boolean
}) {
	return (
		<div className="inline-flex w-full sm:w-auto rounded-lg bg-slate-100 p-1 gap-1">
			{options.map((o) => (
				<button
					key={o.value}
					type="button"
					disabled={disabled}
					onClick={() => onChange(o.value)}
					className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all disabled:cursor-not-allowed ${
						value === o.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
					}`}>
					{o.label}
				</button>
			))}
		</div>
	)
}

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
	<span className="text-[11px] font-medium text-slate-400 block mb-1">{children}</span>
)

const posVolume = (p: Position) => ((p.length || 0) * (p.width || 0) * (p.height || 0)) / 1_000_000 * (p.quantity || 0)
const posWeight = (p: Position) => (p.weight || 0) * (p.quantity || 0)

export type WaybillSection = 'header' | 'sender' | 'receiver' | 'cargo' | 'payment' | 'extras'

export function WaybillForm({
	value,
	onChange,
	readOnly = false,
	only,
}: {
	value: Waybill
	onChange: (w: Waybill) => void
	readOnly?: boolean
	// Какие секции рендерить (для пошагового визарда). Без указания — все (полный режим).
	only?: WaybillSection[]
}) {
	const w = value
	const show = (k: WaybillSection) => !only || only.includes(k)
	const set = (patch: Partial<Waybill>) => onChange({ ...w, ...patch })
	const setSender = (patch: Partial<Waybill['sender']>) => set({ sender: { ...w.sender, ...patch } })
	const setReceiver = (patch: Partial<Waybill['receiver']>) => set({ receiver: { ...w.receiver, ...patch } })

	const updatePos = (id: string, patch: Partial<Position>) =>
		set({ positions: w.positions.map((p) => (p.id === id ? { ...p, ...patch } : p)) })
	const addPos = () => set({ positions: [...w.positions, emptyPosition()] })
	const removePos = (id: string) =>
		set({ positions: w.positions.length > 1 ? w.positions.filter((p) => p.id !== id) : w.positions })

	const dis = readOnly
	const fld = `${FIELD} ${dis ? 'opacity-60 pointer-events-none' : ''}`
	// компактный ввод для габаритов
	const dim = `${FIELD} !px-2 text-center ${dis ? 'opacity-60 pointer-events-none' : ''}`

	return (
		<div className="flex flex-col gap-0">
			{readOnly && !only && (
				<div className="mb-6 flex items-center gap-2 text-[13px] bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-3.5 py-2.5">
					<Info className="w-4 h-4 shrink-0" />
					Роль «Логист»: форма доступна только для просмотра. Редактирование — у Оператора / Администратора.
				</div>
			)}

			{/* Шапка: номер + статус */}
			{show('header') && (
			<div className="mb-7 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 px-4 sm:px-5 py-4">
				<div>
					<p className="text-[11px] font-semibold text-amber-700/70 uppercase tracking-wide">Номер накладной</p>
					<p className="text-xl font-bold text-slate-900 mt-0.5">
						{w.number ? `№${w.number}` : <span className="text-slate-400 text-base font-medium">присвоится при сохранении</span>}
					</p>
				</div>
				<div className="min-w-[220px]">
					<Label>Статус</Label>
					<Select<WaybillStatus>
						value={w.status}
						disabled={dis}
						onChange={(status) => set({ status })}
						options={(Object.keys(STATUS_LABELS) as WaybillStatus[]).map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
					/>
				</div>
			</div>
			)}

			{/* Отправитель */}
			{show('sender') && (
			<Section
				icon={User}
				title="Отправитель"
				hint="По умолчанию — реквизиты склада ЛТТ в Алматы">
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div>
						<Label req>ФИО отправителя</Label>
						<input
							value={w.sender.fullName}
							disabled={dis}
							onChange={(e) => setSender({ fullName: e.target.value })}
							maxLength={150}
							placeholder="Иванов Иван Иванович"
							className={fld}
						/>
					</div>
					<div>
						<Label req>Тип отправителя</Label>
						<Radio
							value={w.sender.type}
							disabled={dis}
							onChange={(type) => setSender({ type })}
							options={[
								{ value: 'individual', label: 'Физлицо' },
								{ value: 'company', label: 'Компания' },
							]}
						/>
					</div>
					{w.sender.type === 'company' && (
						<>
							<div>
								<Label req>Название компании</Label>
								<input
									value={w.sender.companyName}
									disabled={dis}
									onChange={(e) => setSender({ companyName: e.target.value })}
									placeholder="ТОО «…»"
									className={fld}
								/>
							</div>
							<div>
								<Label>ИНН / БИН</Label>
								<input
									value={w.sender.companyTin}
									disabled={dis}
									onChange={(e) => setSender({ companyTin: e.target.value.replace(/\D/g, '') })}
									placeholder="Только цифры"
									className={fld}
								/>
							</div>
							<div className="sm:col-span-2">
								<Label>Контактное лицо</Label>
								<input
									value={w.sender.contactPerson}
									disabled={dis}
									onChange={(e) => setSender({ contactPerson: e.target.value })}
									className={fld}
								/>
							</div>
						</>
					)}
					<div className="sm:col-span-2">
						<Label req>Адрес отправителя</Label>
						<input
							value={w.sender.address}
							disabled={dis}
							onChange={(e) => setSender({ address: e.target.value })}
							className={fld}
						/>
					</div>
					<div>
						<Label req>Город</Label>
						<input
							value={w.sender.city}
							disabled={dis}
							onChange={(e) => setSender({ city: e.target.value })}
							className={fld}
						/>
					</div>
					<div>
						<Label req>Страна</Label>
						<input
							value={w.sender.country}
							disabled={dis}
							onChange={(e) => setSender({ country: e.target.value })}
							className={fld}
						/>
					</div>
				</div>
			</Section>
			)}

			{/* Получатель */}
			{show('receiver') && (
			<Section
				icon={UserRound}
				title="Получатель"
				hint="Телефон используется для уведомления клиента">
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div className="sm:col-span-2">
						<Label req>Фамилия, Имя, Отчество</Label>
						<input
							value={w.receiver.fullName}
							disabled={dis}
							onChange={(e) => setReceiver({ fullName: e.target.value })}
							maxLength={150}
							placeholder="Троценко Никита Алексеевич"
							className={fld}
						/>
					</div>
					<div>
						<Label req>Телефон</Label>
						<input
							value={w.receiver.phone}
							disabled={dis}
							onChange={(e) => setReceiver({ phone: e.target.value.replace(/[^\d+\s()-]/g, '') })}
							placeholder="+7 (___) ___-__-__"
							className={fld}
						/>
					</div>
					<div>
						<Label>ИНН / ИИН</Label>
						<input
							value={w.receiver.tin}
							disabled={dis}
							onChange={(e) => setReceiver({ tin: e.target.value.replace(/\D/g, '') })}
							placeholder="Необязательно"
							className={fld}
						/>
					</div>
					<div>
						<Label>Паспорт</Label>
						<input
							value={w.receiver.passport}
							disabled={dis}
							onChange={(e) => setReceiver({ passport: e.target.value })}
							placeholder="#### ######"
							className={fld}
						/>
					</div>
					<div className="sm:col-span-2 sm:row-start-2">
						<Label req>Полный адрес доставки</Label>
						<input
							value={w.receiver.address}
							disabled={dis}
							onChange={(e) => setReceiver({ address: e.target.value })}
							maxLength={250}
							placeholder="г. Казань, ул. Южно-промышленная 30А"
							className={fld}
						/>
					</div>
					<div>
						<Label req>Город доставки</Label>
						<input
							value={w.receiver.city}
							disabled={dis}
							onChange={(e) => setReceiver({ city: e.target.value })}
							className={fld}
						/>
					</div>
					<div>
						<Label req>Страна доставки</Label>
						<input
							value={w.receiver.country}
							disabled={dis}
							onChange={(e) => setReceiver({ country: e.target.value })}
							className={fld}
						/>
					</div>
				</div>
				<p className="text-xs text-slate-400 mt-3 flex items-start gap-1.5">
					<Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
					ИНН и паспорт необязательны; хранятся в защищённом виде, доступ по ролям.
				</p>
			</Section>
			)}

			{/* Груз */}
			{show('cargo') && (
			<Section
				icon={PackageOpen}
				title="Описание отправления"
				hint="Характер груза, позиции, вес и объём">
				<Label req>Характер груза</Label>
				<div className="flex flex-wrap gap-2 mb-2.5">
					{NATURE_PRESETS.map((n) => (
						<button
							key={n}
							type="button"
							disabled={dis}
							onClick={() => set({ nature: n })}
							className={`px-3.5 py-1.5 rounded-full text-sm border transition-all disabled:opacity-60 ${
								w.nature === n
									? 'bg-orange-500 border-orange-500 text-white'
									: 'bg-white border-slate-200 text-slate-600 hover:border-orange-300'
							}`}>
							{n}
						</button>
					))}
				</div>
				<input
					value={w.nature}
					disabled={dis}
					onChange={(e) => set({ nature: e.target.value })}
					placeholder="или введите свой характер груза"
					className={`${fld} mb-5`}
				/>

				<div className="flex items-center justify-between mb-2">
					<Label>Позиции груза</Label>
					<span className="text-xs text-slate-400">{w.positions.length} поз.</span>
				</div>
				<div className="flex flex-col gap-3">
					{w.positions.map((p, i) => (
						<div
							key={p.id}
							className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
							<div className="flex items-center gap-2.5 mb-3">
								<span className="shrink-0 w-6 h-6 rounded-md bg-white border border-slate-200 text-slate-500 text-xs font-semibold flex items-center justify-center">
									{i + 1}
								</span>
								<input
									value={p.name}
									disabled={dis}
									onChange={(e) => updatePos(p.id, { name: e.target.value })}
									placeholder="Наименование (напр. Электровелосипеды SK8)"
									className={`${fld} flex-1`}
								/>
								{!dis && w.positions.length > 1 && (
									<button
										type="button"
										onClick={() => removePos(p.id)}
										className="shrink-0 p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
										aria-label="Удалить позицию">
										<Trash2 className="w-4 h-4" />
									</button>
								)}
							</div>
							<div className="grid grid-cols-2 lg:grid-cols-12 gap-3">
								<div className="lg:col-span-2">
									<FieldLabel>Кол-во, шт</FieldLabel>
									<DecimalInput
										value={p.quantity}
										onChange={(v) => updatePos(p.id, { quantity: v })}
										className={dim}
									/>
								</div>
								<div className="col-span-2 lg:col-span-5">
									<FieldLabel>Габариты, см (Д × Ш × В)</FieldLabel>
									<div className="flex items-center gap-1.5">
										<DecimalInput
											value={p.length}
											onChange={(v) => updatePos(p.id, { length: v })}
											className={dim}
										/>
										<span className="text-slate-300">×</span>
										<DecimalInput
											value={p.width}
											onChange={(v) => updatePos(p.id, { width: v })}
											className={dim}
										/>
										<span className="text-slate-300">×</span>
										<DecimalInput
											value={p.height}
											onChange={(v) => updatePos(p.id, { height: v })}
											className={dim}
										/>
									</div>
								</div>
								<div className="lg:col-span-2">
									<FieldLabel>Вес места, кг</FieldLabel>
									<DecimalInput
										value={p.weight}
										onChange={(v) => updatePos(p.id, { weight: v })}
										className={dim}
									/>
								</div>
								<div className="col-span-2 lg:col-span-3">
									<FieldLabel>Стоимость, ₸</FieldLabel>
									<DecimalInput
										value={p.price}
										onChange={(v) => updatePos(p.id, { price: v })}
										className={dim}
									/>
								</div>
							</div>
							{(posWeight(p) > 0 || posVolume(p) > 0) && (
								<div className="mt-2.5 pt-2.5 border-t border-slate-200/70 text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
									<span>Объём позиции: <b className="text-slate-700">{fmtDecimal(posVolume(p))} м³</b></span>
									<span>Вес позиции: <b className="text-slate-700">{fmtDecimal(posWeight(p), 1)} кг</b></span>
								</div>
							)}
						</div>
					))}
				</div>
				{!dis && (
					<button
						type="button"
						onClick={addPos}
						className="mt-3 inline-flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-700 font-medium">
						<Plus className="w-4 h-4" /> Добавить позицию
					</button>
				)}

				{/* Итоги */}
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
					<div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
						<p className="text-xs text-slate-500">Общий вес (авто)</p>
						<p className="text-lg font-bold text-slate-900 mt-0.5">{fmtDecimal(totalWeight(w.positions), 1)} кг</p>
					</div>
					<div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
						<div className="flex items-center justify-between">
							<p className="text-xs text-slate-500">Объём</p>
							<label className="text-[11px] text-slate-500 flex items-center gap-1.5 cursor-pointer">
								<input
									type="checkbox"
									disabled={dis}
									checked={w.manualVolume}
									onChange={(e) => set({ manualVolume: e.target.checked })}
									className="accent-orange-500"
								/>
								ввести вручную
							</label>
						</div>
						{w.manualVolume ? (
							<DecimalInput
								value={w.volume}
								onChange={(v) => set({ volume: v })}
								className={`${fld} mt-1.5`}
								placeholder="м³"
							/>
						) : (
							<p className="text-lg font-bold text-slate-900 mt-0.5">{fmtDecimal(autoVolume(w.positions))} м³</p>
						)}
					</div>
				</div>

				<div className="mt-5">
					<Label req>Соответствие упаковки</Label>
					<Radio
						value={w.packagingOk ? 'yes' : 'no'}
						disabled={dis}
						onChange={(v) => set({ packagingOk: v === 'yes' })}
						options={[
							{ value: 'yes', label: 'Да' },
							{ value: 'no', label: 'Нет' },
						]}
					/>
				</div>

				<div className="mt-5">
					<Label>Спец-инструкция</Label>
					<div className="flex flex-wrap gap-1.5 mb-2">
						{INSTRUCTION_HINTS.map((h) => (
							<button
								key={h}
								type="button"
								disabled={dis}
								onClick={() =>
									set({ specialInstructions: w.specialInstructions ? `${w.specialInstructions}, ${h}` : h })
								}
								className="px-2.5 py-1 rounded-md text-xs bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-60 transition-colors">
								+ {h}
							</button>
						))}
					</div>
					<textarea
						value={w.specialInstructions}
						disabled={dis}
						onChange={(e) => set({ specialInstructions: e.target.value })}
						rows={2}
						placeholder="Особые условия перевозки…"
						className={`${fld} resize-none`}
					/>
				</div>
			</Section>
			)}

			{/* Оплата */}
			{show('payment') && (
			<Section
				icon={Wallet}
				title="Оплата">
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div>
						<Label req>Кто оплачивает</Label>
						<Radio
							value={w.payer}
							disabled={dis}
							onChange={(payer) => set({ payer })}
							options={[
								{ value: 'sender', label: 'Отправитель' },
								{ value: 'receiver', label: 'Получатель' },
							]}
						/>
					</div>
					<div>
						<Label req>Способ оплаты</Label>
						<Radio
							value={w.payMethod}
							disabled={dis}
							onChange={(payMethod) => set({ payMethod })}
							options={[
								{ value: 'cash', label: 'Наличный' },
								{ value: 'cashless', label: 'Безналичный' },
							]}
						/>
					</div>
					<div className="sm:col-span-2">
						<Label req>Сумма к оплате</Label>
						<div className="relative">
							<DecimalInput
								value={w.amount}
								onChange={(v) => set({ amount: v })}
								className={`${fld} pr-10`}
								placeholder="0"
							/>
							<span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">₸</span>
						</div>
						<p className="text-xs text-slate-400 mt-1.5">Подставляется автоматически из калькулятора (Блок №3).</p>
					</div>
				</div>
			</Section>
			)}

			{/* Доп. реквизиты */}
			{show('extras') && (
			<Section
				icon={CalendarDays}
				title="Дополнительные реквизиты">
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div>
						<Label req>Дата приёма груза</Label>
						<div className={dis ? 'opacity-60 pointer-events-none' : ''}>
							<DatePickerField
								value={w.acceptanceDate}
								onChange={(v) => set({ acceptanceDate: v })}
							/>
						</div>
					</div>
				</div>
				<p className="text-xs text-slate-400 mt-3 flex items-start gap-1.5">
					<Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
					Место для печати и подписи отправителя формируются в PDF-накладной (кнопка «Скачать PDF»).
				</p>
			</Section>
			)}
		</div>
	)
}
