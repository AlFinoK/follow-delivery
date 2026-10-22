'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
	id: string
	message: string
	type: ToastType
	exiting?: boolean
}

// Уникальные id тостов: Date.now() совпадает у двух тостов в одну миллисекунду,
// и тогда «уход» одного гасил оба.
let toastSeq = 0
export function newToastId(): string {
	toastSeq += 1
	return `toast-${toastSeq}`
}

/**
 * Контейнер тостов — ОДИН для всех страниц: снизу по центру, поверх всего, с учётом
 * безопасной зоны телефона. Сам контейнер клики пропускает (pointer-events-none), чтобы
 * не перекрывать кнопки под ним; кликабельны только сами тосты. Новые — снизу.
 */
export const TOAST_VIEWPORT =
	'fixed inset-x-0 bottom-0 z-[70] flex flex-col items-center gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pointer-events-none'

// Тост залит цветом статуса целиком. У «предупреждения» текст тёмный: белый на
// янтарном не проходит по контрасту. Цвета одинаковы в светлой и тёмной теме — тост
// должен читаться как сигнал поверх любой страницы.
const STYLES: Record<ToastType, { cls: string; Icon: typeof Info }> = {
	success: { cls: 'bg-emerald-600 text-white shadow-emerald-900/20', Icon: CheckCircle2 },
	error: { cls: 'bg-red-600 text-white shadow-red-900/25', Icon: AlertCircle },
	warning: { cls: 'bg-amber-400 text-amber-950 shadow-amber-900/20', Icon: AlertTriangle },
	info: { cls: 'bg-slate-800 text-white shadow-slate-900/25 dark:bg-zinc-700', Icon: Info },
}

export function ToastItem({ toast }: { toast: Toast }) {
	const [visible, setVisible] = useState(false)
	useEffect(() => {
		const raf = requestAnimationFrame(() => setVisible(true))
		return () => cancelAnimationFrame(raf)
	}, [])
	const shown = visible && !toast.exiting
	const { cls, Icon } = STYLES[toast.type] ?? STYLES.info
	// Ошибка и предупреждение озвучиваются сразу (alert), успех и инфо — вежливо (status).
	const urgent = toast.type === 'error' || toast.type === 'warning'
	return (
		<div
			role={urgent ? 'alert' : 'status'}
			aria-live={urgent ? 'assertive' : 'polite'}
			className={`pointer-events-auto w-full max-w-sm flex items-start gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all duration-200 ease-out motion-reduce:transition-none ${cls} ${
				shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
			}`}>
			<Icon aria-hidden="true" className="w-[18px] h-[18px] mt-px shrink-0" />
			<span className="leading-snug min-w-0 break-words">{toast.message}</span>
		</div>
	)
}
