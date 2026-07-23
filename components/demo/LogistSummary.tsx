'use client'

import { useState } from 'react'
import { Copy, Check, Send } from 'lucide-react'
import { buildLogistSummary, type Waybill } from '@/lib/demo/waybill'

// Блок №2 — сводка для логистов. Формируется автоматически из Блока №1,
// формат строго по образцу заказчика (п.3.3). Пустые необязательные строки скрыты.
export function LogistSummary({ waybill }: { waybill: Waybill }) {
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

	// Демо-отправка: WhatsApp через wa.me (без Business API). В проде — выбранный канал.
	const send = () => {
		const phone = waybill.receiver.phone.replace(/\D/g, '')
		const url = `https://wa.me/${phone}?text=${encodeURIComponent(summary)}`
		window.open(url, '_blank')
	}

	return (
		<div>
			<p className="text-xs text-slate-500 dark:text-zinc-400 mb-3">
				Сводка собирается автоматически из накладной (Блок №1). Формат — по образцу заказчика.
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
					{copied ? 'Скопировано' : 'Скопировать'}
				</button>
				<button
					type="button"
					onClick={send}
					disabled={!waybill.receiver.phone.trim()}
					className="inline-flex items-center gap-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 hover:border-orange-300 text-slate-700 dark:text-zinc-200 font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
					<Send className="w-4 h-4" />
					Отправить логисту
				</button>
			</div>
			<p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-2">
				Демо: «Отправить» открывает WhatsApp. В проде канал согласуется (WhatsApp Business API / Telegram / e-mail).
			</p>
		</div>
	)
}
