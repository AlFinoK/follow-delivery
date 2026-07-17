'use client'

import { X, MessageSquare, Check } from 'lucide-react'

// Демо-имитация уведомления клиенту (§5). Реальной отправки нет — показываем,
// что и куда ушло бы (SMS-шлюз / WhatsApp Business API) + лог.
export function NotifyModal({
	phone,
	text,
	onClose,
}: {
	phone: string
	text: string
	onClose: () => void
}) {
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
			<div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
				<div className="flex items-center gap-3 p-4 border-b border-slate-100">
					<span className="w-9 h-9 rounded-xl bg-green-100 text-green-600 flex items-center justify-center shrink-0">
						<MessageSquare className="w-5 h-5" />
					</span>
					<div className="flex-1 min-w-0">
						<p className="font-semibold text-slate-900">Уведомление отправлено</p>
						<p className="text-xs text-slate-500">Демо — реальная отправка не производится</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="text-slate-400 hover:text-slate-600 shrink-0">
						<X className="w-5 h-5" />
					</button>
				</div>
				<div className="p-4 space-y-3 text-sm">
					<div className="flex items-center gap-2 text-slate-600">
						<Check className="w-4 h-4 text-green-500 shrink-0" />
						<span>
							Канал: <b>SMS</b> → <b>{phone || '—'}</b>
						</span>
					</div>
					<div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-700 whitespace-pre-wrap">
						{text}
					</div>
					<p className="text-xs text-slate-400">
						Лог: дата · номер накладной · статус доставки сообщения (записывается в проде).
					</p>
				</div>
				<div className="p-4 pt-0">
					<button
						type="button"
						onClick={onClose}
						className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm">
						Понятно
					</button>
				</div>
			</div>
		</div>
	)
}
