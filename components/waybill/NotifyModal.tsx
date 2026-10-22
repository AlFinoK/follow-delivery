'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { AlertTriangle, Bell, Check, RotateCcw, Send, X } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { Spinner } from '@/components/Spinner'
import { repos } from '@/lib/data/repos'
import { RepoError } from '@/lib/data/types'
import { notifyErrorText, splitJournalError } from '@/components/waybill/notifyErrors'
import { buildClientMessage } from '@/lib/notify/message'
import { whatsappLink } from '@/lib/notify/links'
import type { NotificationDTO, NotifyOutcome } from '@/lib/notify/types'
import type { Waybill } from '@/lib/waybill/model'

// Модалка кнопки «Уведомить клиента». Канал один — WhatsApp.
//
// Работает в двух режимах, и оператор видит, в каком именно:
//   авто   — WhatsApp-провайдер настроен: сообщение уходит с сервера;
//   ручной — провайдер не настроен: текст открывается ссылкой wa.me, отправку
//            подтверждает оператор.
//
// Ручной режим доступен ВСЕГДА, в том числе для несохранённой накладной: ссылка не
// требует сервера. Автоотправке нужен docId — по нему пишется журнал уведомлений.

interface NotifyModalProps {
	isOpen: boolean
	waybill: Waybill
	/**
	 * Форма отличается от сохранённой копии. Сервер строит и телефон, и текст из строки БД,
	 * а не из формы — поэтому при несохранённых правках автоотправка отключается (клиент
	 * получил бы старые данные по старому номеру). Ручной режим (wa.me) берёт значения
	 * из формы и работает как обычно.
	 */
	dirty?: boolean
	onClose: () => void
	onToast: (message: string, type?: 'success' | 'error') => void
	/**
	 * Свежий журнал отправок (новые сверху) — при открытии окна и после каждой отправки.
	 * Карточка накладной берёт из него метку «уведомлён ли клиент», не перечитывая накладную.
	 */
	onHistory?: (items: NotificationDTO[]) => void
}

/** Элементы, между которыми ходит Tab внутри окна. */
const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** «21.08, 14:05» — за день бывает несколько отправок, поэтому со временем. */
function sentAt(iso: string): string {
	return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

/**
 * Индикатор отправки.
 *
 * Отправка не мгновенная: сервер проверяет номер, шлёт сообщение, а затем подтверждает
 * доставку у провайдера (до ~10 с). Без движения на экране окно выглядит зависшим —
 * оператор жал кнопку повторно и упирался в защиту от дублей.
 *
 * Прогресс неопределённый: сервер не сообщает долю выполнения. Что реально помогает
 * — счётчик секунд (видно, что процесс живой) и смена подписи на порогах, включая
 * отдельную строку для затянувшейся отправки, чтобы не закрывали окно раньше времени.
 */
function SendingProgress() {
	const { t } = useLang()
	const [sec, setSec] = useState(0)

	useEffect(() => {
		const id = setInterval(() => setSec((s) => s + 1), 1000)
		return () => clearInterval(id)
	}, [])

	const stepKey = sec >= 12 ? 'nmStepSlow' : sec >= 3 ? 'nmStepConfirm' : 'nmStepSend'

	return (
		<div className="ltt-fade-up rounded-lg border border-orange-100 dark:border-orange-500/20 bg-orange-50 dark:bg-orange-500/10 px-3 py-2.5">
			<p className="flex items-center gap-2 text-xs font-medium text-orange-700 dark:text-orange-300">
				<Spinner className="w-3.5 h-3.5 shrink-0" />
				<span className="min-w-0">{t(stepKey)}</span>
				<span className="ml-auto shrink-0 tabular-nums text-orange-500/80 dark:text-orange-400/70">
					{sec}&thinsp;{t('nmStepSec')}
				</span>
			</p>
			<div className="mt-2 h-1 overflow-hidden rounded-full bg-orange-200/70 dark:bg-orange-500/20">
				<div className="ltt-notify-bar h-full w-2/5 rounded-full bg-orange-500 dark:bg-orange-400" />
			</div>
		</div>
	)
}

const STATUS_KEYS = {
	pending: 'nmStPending',
	sent: 'nmStSent',
	delivered: 'nmStDelivered',
	read: 'nmStRead',
	failed: 'nmStFailed',
} as const

export function NotifyModal({ isOpen, waybill, dirty = false, onClose, onToast, onHistory }: NotifyModalProps) {
	const { t } = useLang()
	const titleId = useId()
	const dialogRef = useRef<HTMLDivElement>(null)
	// Номер «сеанса» открытия окна: растёт при каждом открытии и закрытии. Запрос отправки
	// помнит свой сеанс и по завершении НЕ закрывает окно, если оно уже закрыто/открыто заново
	// (иначе ответ на прошлую отправку захлопнул бы новое окно у оператора под руками).
	const sessionRef = useRef(0)
	const [sending, setSending] = useState(false)
	const [outcome, setOutcome] = useState<NotifyOutcome | null>(null)
	const [history, setHistory] = useState<NotificationDTO[]>([])
	// null — ещё не спросили у сервера; до ответа кнопка в ручном режиме, чтобы
	// первый клик заведомо сработал, а не наткнулся на ненастроенный провайдер.
	const [auto, setAuto] = useState<boolean | null>(null)

	const phone = waybill.receiver.phone
	const docId = waybill.docId
	// Шаблон — значение по умолчанию, оператор может править текст перед отправкой.
	// Правки живут только в этом окне: закрыли — при следующем открытии снова шаблон,
	// иначе вчерашняя правка незаметно уехала бы новому клиенту.
	const template = buildClientMessage(waybill)
	const [text, setText] = useState(template)
	const edited = text !== template

	// Колбэк — через ref: в зависимостях loadStatus он перезапускал бы эффект открытия
	// (и сбрасывал правку текста) при каждой новой функции от родителя.
	const onHistoryRef = useRef(onHistory)
	useEffect(() => {
		onHistoryRef.current = onHistory
	}, [onHistory])

	const loadStatus = useCallback(async () => {
		if (!docId) return
		try {
			const st = await repos.notify.status(docId)
			setHistory(st.items)
			setAuto(st.whatsappAvailable)
			onHistoryRef.current?.(st.items)
		} catch {
			// журнал и флаг — справочные: из-за них модалку не ломаем, останется ручной режим
		}
	}, [docId])

	// Сеанс — до остальных эффектов: они читают актуальный номер.
	useEffect(() => {
		sessionRef.current += 1
	}, [isOpen])

	useEffect(() => {
		if (!isOpen) return
		setOutcome(null)
		setText(buildClientMessage(waybill))
		void loadStatus()
	}, [isOpen, loadStatus, waybill])

	// Фокус: при открытии — на само окно (не на «Отправить»: случайный Enter не должен
	// отправлять клиенту сообщение); при закрытии — обратно на кнопку, открывшую окно.
	useEffect(() => {
		if (!isOpen) return
		const prev = document.activeElement as HTMLElement | null
		const raf = requestAnimationFrame(() => dialogRef.current?.focus())
		return () => {
			cancelAnimationFrame(raf)
			prev?.focus?.()
		}
	}, [isOpen])

	// Escape закрывает (кроме времени отправки — как и клик по фону); Tab ходит по кругу
	// внутри окна, не уходя на страницу под ним.
	useEffect(() => {
		if (!isOpen) return
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				if (!sending) {
					e.preventDefault()
					onClose()
				}
				return
			}
			if (e.key !== 'Tab') return
			const box = dialogRef.current
			if (!box) return
			const items = Array.from(box.querySelectorAll<HTMLElement>(FOCUSABLE))
			if (items.length === 0) {
				e.preventDefault()
				box.focus()
				return
			}
			const first = items[0]
			const last = items[items.length - 1]
			const active = document.activeElement
			if (!box.contains(active)) {
				e.preventDefault()
				;(e.shiftKey ? last : first).focus()
			} else if (e.shiftKey && (active === first || active === box)) {
				e.preventDefault()
				last.focus()
			} else if (!e.shiftKey && active === last) {
				e.preventDefault()
				first.focus()
			}
		}
		document.addEventListener('keydown', onKey)
		return () => document.removeEventListener('keydown', onKey)
	}, [isOpen, sending, onClose])

	if (!isOpen) return null

	// Авто-режим возможен, только если провайдер настроен, накладная сохранена (журнал
	// уведомлений пишется по её docId) И форма не расходится с сохранённой копией.
	const waAuto = !!auto && !!docId && !dirty
	const busy = sending

	const send = async () => {
		if (!docId || dirty) return
		const session = sessionRef.current
		setSending(true)
		try {
			// Правку передаём только если она есть: иначе шаблон соберёт сервер сам.
			const res = await repos.notify.send(docId, edited ? text : undefined)
			const stale = session !== sessionRef.current
			if (!stale) {
				setOutcome(res)
				setAuto(res.whatsappAvailable)
			}
			void loadStatus()

			if (res.status === 'sent') {
				// Успех — закрываем окно: результат оператор увидит в тосте, а держать
				// открытой форму, которая уже сделала своё дело, незачем. Окно, открытое
				// заново за время отправки, не трогаем.
				onToast(t('nmSentWa'))
				if (!stale) onClose()
				return
			}
			// Неудача — окно оставляем открытым: в нём видна причина.
			if (res.status === 'failed') onToast(notifyErrorText(t, res.code, res.error, t('nmFailed')), 'error')
		} catch (e) {
			// Тело ошибки сервера русское — оператору показываем перевод и код ответа.
			onToast(e instanceof RepoError ? `${t('nmFailed')} (${e.status})` : t('nmFailed'), 'error')
			// Сервер мог успеть записать строку журнала до сбоя — подтягиваем её.
			void loadStatus()
		} finally {
			setSending(false)
		}
	}

	const openManual = () => window.open(whatsappLink(phone, text), '_blank', 'noopener,noreferrer')

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4"
			// Во время отправки клик мимо окна игнорируем: запрос всё равно не отменится,
			// а оператор потерял бы из виду и индикатор, и результат.
			onClick={() => !busy && onClose()}>
			<div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
			<div
				ref={dialogRef}
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				tabIndex={-1}
				className="relative bg-white dark:bg-zinc-900 rounded-xl shadow-xl w-full max-w-lg border border-slate-200 dark:border-zinc-700 max-h-[90vh] overflow-y-auto focus:outline-none"
				onClick={(e) => e.stopPropagation()}>
				<div className="flex items-start justify-between gap-3 p-5 pb-3">
					<div className="flex items-center gap-3 min-w-0">
						<span className="w-9 h-9 rounded-lg bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
							<Bell className="w-[18px] h-[18px]" />
						</span>
						<div className="min-w-0">
							<h3
								id={titleId}
								className="text-[15px] font-semibold text-slate-900 dark:text-zinc-100 leading-tight">
								{t('nmTitle')}
							</h3>
							<p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 truncate">
								{waybill.receiver.fullName || t('nmRecipient')} · {phone || t('nmNoPhone')}
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						disabled={busy}
						aria-label={t('nmClose')}
						className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed">
						<X className="w-4 h-4" />
					</button>
				</div>

				<div className="px-5 pb-5 flex flex-col gap-4">
					{/* Окно — подтверждение, а не «уже отправили». Дважды приходило
					    «ничего не отправилось» именно потому, что внешняя кнопка
					    открывает предпросмотр, а отправляет кнопка внутри. В ручном
					    режиме подсказка не нужна: там про это говорит nmManualHint. */}
					{waAuto && phone && <p className="text-xs text-slate-500 dark:text-zinc-400">{t('nmConfirmHint')}</p>}

					{!phone && (
						<p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg px-3 py-2">
							{t('nmNoPhone')}
						</p>
					)}

					{!docId && (
						<p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-lg px-3 py-2">
							{t('nmNeedSave')}
						</p>
					)}

					{/* Форма изменена, но не сохранена: сервер отправит данные из БД, то есть
						    СТАРЫЕ — поэтому автоотправка выключена, а оператору сказано почему. */}
						{docId && dirty && (
							<p
								role="alert"
								className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-lg px-3 py-2">
								{t('nmUnsaved')}
							</p>
						)}

						{/* Текст редактируемый: шаблон подставлен по умолчанию, оператор может
					    поправить перед отправкой. На время отправки поле блокируется:
					    правка, внесённая после клика, в уже ушедшее сообщение не попадёт,
					    а на экране выглядела бы так, будто клиент получил именно её. */}
					<div>
						<div className="flex items-center justify-between gap-2 mb-1.5">
							<p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">{t('nmPreviewWa')}</p>
							{edited && (
								<button
									type="button"
									onClick={() => setText(template)}
									className="inline-flex items-center gap-1 text-xs font-medium text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300">
									<RotateCcw className="w-3.5 h-3.5" /> {t('nmReset')}
								</button>
							)}
						</div>
						<textarea
							value={text}
							onChange={(e) => setText(e.target.value)}
							disabled={busy}
							rows={10}
							className="w-full bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-700 focus:border-orange-400 dark:focus:border-orange-500 focus:outline-none text-slate-800 dark:text-zinc-100 rounded-lg p-3 text-[13px] leading-relaxed font-sans resize-y disabled:opacity-60"
						/>
					</div>

					{/* Пока идёт отправка — индикатор вместо итога: они взаимоисключающи,
					    итог появится, когда сервер ответит. */}
					{sending && <SendingProgress />}

					{/* Итог отправки */}
					{!busy && outcome && (
						<div
							className={`ltt-fade-up rounded-lg px-3 py-2.5 text-xs border ${
								outcome.status === 'sent'
									? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
									: outcome.status === 'manual'
										? 'bg-slate-50 dark:bg-zinc-800/40 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300'
										: 'bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20 text-red-700 dark:text-red-400'
							}`}>
							<p className="font-semibold flex items-center gap-1.5">
								{outcome.status === 'sent' ? <Check className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
								{outcome.status === 'sent'
									? t('nmSentWa')
									: outcome.status === 'manual'
										? t('nmManualMode')
										: t('nmFailed')}
							</p>
							{outcome.status === 'sent' && outcome.pendingDelivery && <p className="mt-1 opacity-80">{t('nmPending')}</p>}
							{/* В ручном режиме причина («не настроено») уже сказана заголовком. */}
							{outcome.status === 'failed' && (outcome.code || outcome.error) && (
								<p className="mt-1 opacity-80">{notifyErrorText(t, outcome.code, outcome.error, t('nmFailed'))}</p>
							)}
						</div>
					)}

					{/* Одна кнопка: «Отправить» в авто-режиме, «Открыть WhatsApp» — в ручном. */}
					<button
						type="button"
						disabled={!phone || busy}
						onClick={() => (waAuto ? send() : openManual())}
						className="inline-flex w-full items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-4 py-3 rounded-lg text-sm transition-colors">
						{busy ? <Spinner /> : <Send className="w-4 h-4" />}
						{busy ? t('nmSending') : waAuto ? t('nmSend') : t('nmOpenWa')}
					</button>
					{/* Обещать «уйдёт само» в ручном режиме нельзя: там не уходит ничего, пока
					    оператор не нажмёт кнопку и не подтвердит отправку в самом мессенджере. */}
					<p className="text-[11px] text-slate-400 dark:text-zinc-500 -mt-2">
						{auto === null || waAuto || dirty ? '' : t('nmManualHint')}
					</p>

					{/* Журнал: было ли уже отправлено и чем закончилось */}
					{history.length > 0 && (
						<div className="pt-3 border-t border-slate-100 dark:border-zinc-800">
							<p className="text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-2">{t('nmHistory')}</p>
							<ul className="flex flex-col gap-1.5">
								{history.map((h) => {
									// Журнал хранит «КОД: сообщение» — переводим по коду.
									const je = splitJournalError(h.error)
									const errText = h.error ? notifyErrorText(t, je.code, je.message ?? h.error, t('nmFailed')) : undefined
									return (
									<li
										key={h.id}
										className="text-xs text-slate-600 dark:text-zinc-300 flex items-center justify-between gap-2">
										<span className="truncate">
											{/* Старые строки журнала могут быть с каналом sms — до его отключения. */}
											{h.channel === 'sms' ? t('nmChSms') : t('nmChWhatsapp')} · {sentAt(h.createdAt)}
										</span>
										<span
											className={`shrink-0 font-medium ${
												h.status === 'failed'
													? 'text-red-600 dark:text-red-400'
													: h.status === 'delivered' || h.status === 'read'
														? 'text-emerald-600 dark:text-emerald-400'
														: 'text-slate-400 dark:text-zinc-500'
											}`}
											title={errText}>
											{t(STATUS_KEYS[h.status as keyof typeof STATUS_KEYS] ?? 'nmStPending')}
										</span>
									</li>
									)
									})}
							</ul>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}
