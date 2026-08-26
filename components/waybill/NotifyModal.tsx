'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Bell, Check, MessageSquare, RotateCcw, Send, X } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { repos } from '@/lib/data/repos'
import { buildClientMessages } from '@/lib/notify/message'
import { smsLink, smsParts, whatsappLink } from '@/lib/notify/links'
import { BAD_CONTACT, type NotificationDTO, type NotifyChannel, type NotifyOutcome } from '@/lib/notify/types'
import type { Waybill } from '@/lib/waybill/model'

// Модалка кнопки «Уведомить клиента».
//
// Работает в двух режимах, и оператор видит, в каком именно:
//   авто   — настроен Wazzup (и, для фолбэка, SMS-шлюз): сообщение уходит с сервера,
//            SMS досылается сама, если у номера нет WhatsApp;
//   ручной — провайдер не настроен: те же тексты открываются ссылкой в WhatsApp или
//            в приложении сообщений, отправку подтверждает оператор.
//
// Ручной режим доступен ВСЕГДА, в том числе для несохранённой накладной: ссылка не
// требует сервера. Автоотправке нужен docId — по нему пишется журнал уведомлений.

interface NotifyModalProps {
	isOpen: boolean
	waybill: Waybill
	onClose: () => void
	onToast: (message: string, type?: 'success' | 'error') => void
}

/** «21.08, 14:05» — за день бывает несколько отправок, поэтому со временем. */
function sentAt(iso: string): string {
	return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const STATUS_KEYS = {
	pending: 'nmStPending',
	sent: 'nmStSent',
	delivered: 'nmStDelivered',
	read: 'nmStRead',
	failed: 'nmStFailed',
} as const

export function NotifyModal({ isOpen, waybill, onClose, onToast }: NotifyModalProps) {
	const { t, tf } = useLang()
	const [sending, setSending] = useState<NotifyChannel | null>(null)
	const [outcome, setOutcome] = useState<NotifyOutcome | null>(null)
	const [history, setHistory] = useState<NotificationDTO[]>([])
	// null — ещё не спросили у сервера; до ответа кнопки в ручном режиме, чтобы
	// первый клик заведомо сработал, а не наткнулся на ненастроенный провайдер.
	const [auto, setAuto] = useState<{ whatsapp: boolean; sms: boolean } | null>(null)

	const phone = waybill.receiver.phone
	const docId = waybill.docId
	// Шаблон — значение по умолчанию, оператор может править текст перед отправкой.
	// Правки живут только в этом окне: закрыли — при следующем открытии снова шаблон,
	// иначе вчерашняя правка незаметно уехала бы новому клиенту.
	const template = buildClientMessages(waybill)
	const [texts, setTexts] = useState(template)
	const edited = texts.whatsapp !== template.whatsapp || texts.sms !== template.sms

	const loadStatus = useCallback(async () => {
		if (!docId) return
		try {
			const st = await repos.notify.status(docId)
			setHistory(st.items)
			setAuto({ whatsapp: st.whatsappAvailable, sms: st.smsAvailable })
		} catch {
			// журнал и флаги — справочные: из-за них модалку не ломаем, останется ручной режим
		}
	}, [docId])

	useEffect(() => {
		if (!isOpen) return
		setOutcome(null)
		setTexts(buildClientMessages(waybill))
		void loadStatus()
	}, [isOpen, loadStatus, waybill])

	if (!isOpen) return null

	// Автоотправка. Канал не указываем — сервер сам решает: WhatsApp, а SMS уйдёт
	// фолбэком по вебхуку. 'sms' передаём, только когда оператор выбрал его явно.
	const send = async (channel?: NotifyChannel) => {
		if (!docId) return
		setSending(channel ?? 'whatsapp')
		try {
			// Правки передаём только если они есть: иначе шаблон соберёт сервер сам.
			const res = await repos.notify.send(docId, channel, edited ? texts : undefined)
			setOutcome(res)
			if (res.status === 'sent') {
				onToast(res.channel === 'sms' ? t('nmSentSms') : t('nmSentWa'))
			} else if (res.status === 'failed') {
				onToast(res.error || t('nmFailed'), 'error')
			}
			setAuto({ whatsapp: res.whatsappAvailable, sms: res.smsAvailable })
			void loadStatus()
		} catch (e) {
			onToast(e instanceof Error && e.message ? e.message : t('nmFailed'), 'error')
		} finally {
			setSending(null)
		}
	}

	const openManual = (channel: NotifyChannel) => {
		const url = channel === 'sms' ? smsLink(phone, texts.sms) : whatsappLink(phone, texts.whatsapp)
		window.open(url, '_blank', 'noopener,noreferrer')
	}

	// Авто-режим возможен, только если провайдер настроен И накладная сохранена
	// (журнал уведомлений пишется по её docId).
	const waAuto = !!auto?.whatsapp && !!docId
	const smsAuto = !!auto?.sms && !!docId
	const busy = sending !== null

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4"
			onClick={onClose}>
			<div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
			<div
				className="relative bg-white dark:bg-zinc-900 rounded-xl shadow-xl w-full max-w-lg border border-slate-200 dark:border-zinc-700 max-h-[90vh] overflow-y-auto"
				onClick={(e) => e.stopPropagation()}>
				<div className="flex items-start justify-between gap-3 p-5 pb-3">
					<div className="flex items-center gap-3 min-w-0">
						<span className="w-9 h-9 rounded-lg bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
							<Bell className="w-[18px] h-[18px]" />
						</span>
						<div className="min-w-0">
							<h3 className="text-[15px] font-semibold text-slate-900 dark:text-zinc-100 leading-tight">{t('nmTitle')}</h3>
							<p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 truncate">
								{waybill.receiver.fullName || t('nmRecipient')} · {phone || t('nmNoPhone')}
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						aria-label={t('nmClose')}
						className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 shrink-0">
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

					{/* Текст для WhatsApp — основной канал. Поле редактируемое: шаблон
					    подставлен по умолчанию, оператор может поправить перед отправкой. */}
					<div>
						<div className="flex items-center justify-between gap-2 mb-1.5">
							<p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">{t('nmPreviewWa')}</p>
							{edited && (
								<button
									type="button"
									onClick={() => setTexts(template)}
									className="inline-flex items-center gap-1 text-xs font-medium text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300">
									<RotateCcw className="w-3.5 h-3.5" /> {t('nmReset')}
								</button>
							)}
						</div>
						<textarea
							value={texts.whatsapp}
							onChange={(e) => setTexts((v) => ({ ...v, whatsapp: e.target.value }))}
							rows={10}
							className="w-full bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-700 focus:border-orange-400 dark:focus:border-orange-500 focus:outline-none text-slate-800 dark:text-zinc-100 rounded-lg p-3 text-[13px] leading-relaxed font-sans resize-y"
						/>
					</div>

					{/* Текст для SMS — короткий, потому что кириллица режется по 67 символов.
					    Счётчик частей пересчитывается на ходу, чтобы правка не превратила
					    одну SMS в пять незаметно для оператора. */}
					<div>
						<p className="text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-1.5">
							{t('nmPreviewSms')} · {tf('nmSmsParts', { n: smsParts(texts.sms) })}
						</p>
						<textarea
							value={texts.sms}
							onChange={(e) => setTexts((v) => ({ ...v, sms: e.target.value }))}
							rows={3}
							className="w-full bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-700 focus:border-orange-400 dark:focus:border-orange-500 focus:outline-none text-slate-600 dark:text-zinc-300 rounded-lg p-3 text-[13px] leading-relaxed font-sans resize-y"
						/>
					</div>

					{/* Итог отправки */}
					{outcome && (
						<div
							className={`rounded-lg px-3 py-2.5 text-xs border ${
								outcome.status === 'sent'
									? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
									: outcome.status === 'manual'
										? 'bg-slate-50 dark:bg-zinc-800/40 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300'
										: 'bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20 text-red-700 dark:text-red-400'
							}`}>
							<p className="font-semibold flex items-center gap-1.5">
								{outcome.status === 'sent' ? <Check className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
								{outcome.status === 'sent'
									? outcome.channel === 'sms'
										? t('nmSentSms')
										: t('nmSentWa')
									: outcome.status === 'manual'
										? t('nmManualMode')
										: t('nmFailed')}
							</p>
							{/* Ушло SMS вместо WhatsApp — оператор должен видеть, почему. */}
							{outcome.status === 'sent' && outcome.channel === 'sms' && outcome.code === BAD_CONTACT && (
								<p className="mt-1 opacity-80">{t('nmNoWhatsapp')}</p>
							)}
							{outcome.status === 'sent' && outcome.pendingDelivery && <p className="mt-1 opacity-80">{t('nmPending')}</p>}
							{outcome.status !== 'sent' && outcome.error && <p className="mt-1 opacity-80">{outcome.error}</p>}
						</div>
					)}

					{/* Кнопки. В авто-режиме отправляет сервер, в ручном — открывается ссылка. */}
					<div className="flex flex-wrap gap-2">
						<button
							type="button"
							disabled={!phone || busy}
							onClick={() => (waAuto ? send() : openManual('whatsapp'))}
							className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors">
							<Send className="w-4 h-4" />
							{sending === 'whatsapp' ? t('nmSending') : waAuto ? t('nmSendWa') : t('nmOpenWa')}
						</button>
						<button
							type="button"
							disabled={!phone || busy}
							onClick={() => (smsAuto ? send('sms') : openManual('sms'))}
							className="inline-flex items-center gap-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 hover:border-orange-300 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 dark:text-zinc-200 font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors">
							<MessageSquare className="w-4 h-4" />
							{sending === 'sms' ? t('nmSending') : smsAuto ? t('nmSendSms') : t('nmOpenSms')}
						</button>
					</div>
					{/* Подсказка под кнопками зависит от режима. Обещать «SMS уходит само»
					    в ручном режиме нельзя: там не уходит ничего, пока оператор не
					    нажмёт кнопку и не подтвердит отправку в самом мессенджере. */}
					<p className="text-[11px] text-slate-400 dark:text-zinc-500 -mt-2">
						{auto === null ? '' : waAuto ? t('nmSmsHint') : t('nmManualHint')}
					</p>

					{/* Журнал: было ли уже отправлено и чем закончилось */}
					{history.length > 0 && (
						<div className="pt-3 border-t border-slate-100 dark:border-zinc-800">
							<p className="text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-2">{t('nmHistory')}</p>
							<ul className="flex flex-col gap-1.5">
								{history.map((h) => (
									<li
										key={h.id}
										className="text-xs text-slate-600 dark:text-zinc-300 flex items-center justify-between gap-2">
										<span className="truncate">
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
											title={h.error ?? undefined}>
											{t(STATUS_KEYS[h.status as keyof typeof STATUS_KEYS] ?? 'nmStPending')}
										</span>
									</li>
								))}
							</ul>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}
