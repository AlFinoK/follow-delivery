'use client'

import { useState } from 'react'
import { Copy, Check, ChevronDown, Send } from 'lucide-react'
import { buildLogistSummary, type Waybill } from '@/lib/waybill/model'
import { useLang } from '@/contexts/LangContext'

// Блок №2 — сводка для логистов. Формируется автоматически из Блока №1,
// формат строго по образцу заказчика (п.3.3). Пустые необязательные строки скрыты.
//
// «Отправить логисту» открывает WhatsApp с УЖЕ ПОДСТАВЛЕННОЙ сводкой: `wa.me/?text=`
// без номера — это системный «поделиться», текст в нём готов, остаётся выбрать чат.
//
// Прицелиться сразу в конкретную группу И подставить текст нельзя: `chat.whatsapp.com/…`
// это приглашение в группу (открывает её, но пустой), а `wa.me/?text=` подставляет
// текст, но чат выбирает пользователь. Третьего URL у WhatsApp нет. Выбрано второе —
// оператору важнее не набирать текст, чем не выбирать чат.
//
// Настоящая отправка одним кликом возможна только через WAHA по внутреннему id группы
// (`…@g.us`), но для этого номер компании должен состоять в группе.

/** Ссылка-приглашение в группу — вспомогательная, чтобы было куда вступить. */
const GROUP_URL = process.env.NEXT_PUBLIC_LOGIST_GROUP_URL?.trim()

/** WhatsApp с готовым текстом; чат выбирает оператор. */
const shareUrl = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`

/** Сколько строк сводки видно в свёрнутом виде (карточка накладной). */
const COLLAPSED_LINES = 6

/**
 * collapsible — сводка свёрнута до первых строк с кнопкой «Показать полностью» (карточка
 * накладной: длинный моноширинный блок вытеснял вниз всё остальное). Кнопки «Копировать»
 * и «Отправить логисту» видны всегда и работают с ПОЛНЫМ текстом.
 */
export function LogistSummary({ waybill, collapsible = false }: { waybill: Waybill; collapsible?: boolean }) {
	const { t } = useLang()
	const [copied, setCopied] = useState(false)
	const [sent, setSent] = useState(false)
	const [expanded, setExpanded] = useState(false)
	const summary = buildLogistSummary(waybill)
	const lines = summary.split('\n')
	const canCollapse = collapsible && lines.length > COLLAPSED_LINES + 1
	const collapsed = canCollapse && !expanded
	const shown = collapsed ? lines.slice(0, COLLAPSED_LINES).join('\n') : summary

	// Пишем в буфер без await: window.open должен вызваться в том же обработчике
	// клика, иначе браузер посчитает открытие вкладки непрошеным и заблокирует.
	const writeToClipboard = () => {
		if (navigator.clipboard?.writeText) {
			void navigator.clipboard.writeText(summary).catch(fallbackCopy)
			return
		}
		fallbackCopy()
	}

	const fallbackCopy = () => {
		const ta = document.createElement('textarea')
		ta.value = summary
		document.body.appendChild(ta)
		ta.select()
		document.execCommand('copy')
		document.body.removeChild(ta)
	}

	const copy = () => {
		writeToClipboard()
		setCopied(true)
		setTimeout(() => setCopied(false), 2000)
	}

	// Буфер заполняем всё равно: если оператор промахнётся мимо чата или WhatsApp
	// откроется без текста, сводку можно просто вставить.
	const sendToLogist = () => {
		writeToClipboard()
		setSent(true)
		setTimeout(() => setSent(false), 4000)
		window.open(shareUrl(summary), '_blank', 'noopener,noreferrer')
	}

	return (
		<div>
			<p className="text-xs text-slate-500 dark:text-zinc-400 mb-3">{t('lsHint')}</p>
			<div className="relative">
				<pre
					id={collapsible ? 'logist-summary' : undefined}
					className={`bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 rounded-xl p-4 text-sm leading-relaxed whitespace-pre-wrap font-mono overflow-x-auto ${collapsed ? 'pb-8' : 'max-h-[420px]'}`}>
					{shown}
				</pre>
				{/* Затухание внизу: видно, что текст продолжается */}
				{collapsed && (
					<div className="pointer-events-none absolute inset-x-px bottom-px h-10 rounded-b-xl bg-gradient-to-t from-slate-50 dark:from-[#1e1e21] to-transparent" />
				)}
			</div>
			{canCollapse && (
				<button
					type="button"
					onClick={() => setExpanded((v) => !v)}
					aria-expanded={expanded}
					aria-controls="logist-summary"
					className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300">
					<ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
					{expanded ? t('lsCollapse') : t('lsShowAll')}
				</button>
			)}
			<div className="flex flex-wrap gap-2 mt-3">
				<button
					type="button"
					onClick={copy}
					className="inline-flex grow sm:grow-0 items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors">
					{copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
					{copied ? t('copied') : t('lsCopy')}
				</button>
				<button
					type="button"
					onClick={sendToLogist}
					className="inline-flex grow sm:grow-0 items-center justify-center gap-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 hover:border-orange-300 text-slate-700 dark:text-zinc-200 font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors">
					{sent ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
					{sent ? t('lsSentOpened') : t('lsSend')}
				</button>
			</div>
			<p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-2">
				{t('lsSendNote')}
				{GROUP_URL && (
					<>
						{' '}
						<a
							href={GROUP_URL}
							target="_blank"
							rel="noopener noreferrer"
							className="text-orange-600 dark:text-orange-400 hover:underline">
							{t('lsOpenGroup')}
						</a>
					</>
				)}
			</p>
		</div>
	)
}
