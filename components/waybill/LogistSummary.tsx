'use client'

import { useState } from 'react'
import { Copy, Check, Send } from 'lucide-react'
import { buildLogistSummary, type Waybill } from '@/lib/waybill/model'
import { useLang } from '@/contexts/LangContext'

// Блок №2 — сводка для логистов. Формируется автоматически из Блока №1,
// формат строго по образцу заказчика (п.3.3). Пустые необязательные строки скрыты.
export function LogistSummary({ waybill }: { waybill: Waybill }) {
	const { t } = useLang()
	const [copied, setCopied] = useState(false)
	const summary = buildLogistSummary(waybill)

	const copy = async () => {
		try {
			await navigator.clipboard.writeText(summary)
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
		} catch {
			// fallback для старых браузеров
			const ta = document.createElement('textarea')
			ta.value = summary
			document.body.appendChild(ta)
			ta.select()
			document.execCommand('copy')
			document.body.removeChild(ta)
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
		}
	}

	return (
		<div>
			<p className="text-xs text-slate-500 dark:text-zinc-400 mb-3">
				{t('lsHint')}
			</p>
			<pre className="bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 rounded-xl p-4 text-sm leading-relaxed whitespace-pre-wrap font-mono overflow-x-auto max-h-[420px]">
				{summary}
			</pre>
			<div className="flex flex-wrap gap-2 mt-3">
				<button
					type="button"
					onClick={copy}
					className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors">
					{copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
					{copied ? t('copied') : t('lsCopy')}
				</button>
				{/* Отправка отключена до согласования канала (WhatsApp Business API /
				    Telegram / e-mail): раньше кнопка просто открывала wa.me. */}
				<button
					type="button"
					disabled
					title={t('lsSendDisabled')}
					className="inline-flex items-center gap-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
					<Send className="w-4 h-4" />
					{t('lsSend')}
				</button>
			</div>
			<p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-2">
				{t('lsSendNote')}
			</p>
		</div>
	)
}
