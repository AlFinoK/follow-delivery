'use client'

import { useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Truck } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { CURRENCY_SYMBOL } from '@/lib/calculator/config'
import type { CalcResult } from '@/lib/calculator/engine'

const ru = (n: number) => n.toLocaleString('ru-RU', { maximumFractionDigits: 0 })

const noopSubscribe = () => () => {}

/**
 * Нижняя плашка с ценой на телефоне (P6): на узком экране панель результата стоит в самом
 * конце, после всех карточек шаблонов (~2000 px), и клиент не видит, что цена уже посчитана.
 * Тап прокручивает к полной панели. На lg+ не показывается — там результат «прилипает» справа.
 * Видимость (есть цена и панель не в кадре) решает родитель.
 *
 * Рендерится порталом в <body>: на главной калькулятор лежит в обёртке с анимацией
 * .ltt-fade-up, а её transform делает обёртку containing block для position: fixed —
 * плашка «прилипла» бы к блоку, а не к экрану. Тёмная тема при этом сохраняется:
 * класс .dark висит на <html> (AdminThemeShell).
 */
export function StickyPriceBar({ result, visible, onShow }: { result: CalcResult; visible: boolean; onShow: () => void }) {
	const { t } = useLang()
	// document есть только на клиенте; на сервере (и при гидратации) плашку не рисуем
	const isClient = useSyncExternalStore(noopSubscribe, () => true, () => false)
	if (!isClient || !result.ok || typeof result.price !== 'number') return null

	return createPortal(
		<div
			className={`lg:hidden fixed inset-x-0 bottom-0 z-40 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] transition-all duration-200 ${
				visible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
			}`}
			aria-hidden={!visible}>
			<button
				type="button"
				onClick={onShow}
				tabIndex={visible ? 0 : -1}
				className="w-full max-w-xl mx-auto flex items-center gap-3 px-4 py-2.5 rounded-2xl border border-orange-200 dark:border-orange-500/30 bg-white/95 dark:bg-zinc-900/95 backdrop-blur shadow-[0_-4px_24px_-8px_rgba(15,23,42,0.25)] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40">
				<span className="min-w-0 flex-1">
					<span className="block text-[11px] font-medium text-orange-700/80 dark:text-orange-300 truncate">
						{t('calcResPrice')}
						{result.minApplied && <> · {t('calcStickyMinTariff')}</>}
					</span>
					<span className="block text-lg font-bold text-slate-900 dark:text-zinc-100 leading-tight whitespace-nowrap">
						{ru(result.price)} {CURRENCY_SYMBOL}
					</span>
				</span>
				{result.days && (
					<span className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-zinc-400 whitespace-nowrap">
						<Truck className="w-3.5 h-3.5 text-orange-500" />
						{result.days} {t('unitDays')}
					</span>
				)}
				{/* На 390 px подпись кнопки съедала место у цены — оставляем стрелку, текст для скринридера */}
				<span className="shrink-0 w-8 h-8 inline-flex items-center justify-center rounded-lg bg-orange-500 text-white">
					<ChevronDown className="w-4 h-4" aria-hidden />
					<span className="sr-only">{t('calcStickyDetails')}</span>
				</span>
			</button>
		</div>,
		document.body,
	)
}
