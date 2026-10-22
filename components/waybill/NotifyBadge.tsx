'use client'

import { MessageCircle } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import type { LastNotification } from '@/lib/data/types'
import { notifyErrorText, splitJournalError } from '@/components/waybill/notifyErrors'

// Метка «уведомлён ли клиент» — для списка накладных и карточки. Берёт последнюю строку
// журнала Notification (поле lastNotification в GET /api/waybills и /api/waybills/[id]).
// Без неё оператор узнавал о (не)отправке, только открыв окно уведомления.

const LABEL_KEYS = {
	pending: 'nmStPending',
	sent: 'nmStSent',
	delivered: 'nmStDelivered',
	read: 'nmStRead',
	failed: 'nmStFailed',
} as const

const TONE: Record<string, string> = {
	failed: 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/25',
	delivered: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/25',
	read: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/25',
}
const TONE_DEFAULT = 'bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-700'

/** «21.08, 14:05» — как в журнале модалки. */
const at = (iso: string) => new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

/** size: sm — строка списка, md — карточка (в рост с плашкой статуса накладной). */
export function NotifyBadge({ note, size = 'sm' }: { note: LastNotification | null | undefined; size?: 'sm' | 'md' }) {
	const { t, tf } = useLang()
	if (!note) return null
	const label = t(LABEL_KEYS[note.status as keyof typeof LABEL_KEYS] ?? 'nmStPending')
	// Журнал хранит ошибку «КОД: сообщение» — в подсказку идёт перевод по коду.
	const je = splitJournalError(note.error)
	const err = note.status === 'failed' && note.error ? notifyErrorText(t, je.code, je.message ?? note.error, t('nmFailed')) : ''
	const tip = tf('wbNotifyTip', { date: at(note.createdAt) }) + (err ? ` — ${err}` : '')
	return (
		<span
			title={tip}
			className={`inline-flex items-center gap-1 font-medium border whitespace-nowrap ${
				size === 'md' ? 'text-xs px-2.5 py-1 rounded-md' : 'text-[11px] px-1.5 py-0.5 rounded'
			} ${TONE[note.status] ?? TONE_DEFAULT}`}>
			<MessageCircle
				className="w-3 h-3 shrink-0"
				aria-hidden="true"
			/>
			<span className="sr-only">{t('nmChWhatsapp')}: </span>
			{label}
		</span>
	)
}
