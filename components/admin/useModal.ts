'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'

const FOCUSABLE =
	'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Общая доступность модальных окон и выезжающих панелей: Escape закрывает, фокус уходит внутрь
 * (на первый интерактивный элемент), Tab/Shift+Tab не выпускают фокус за пределы окна,
 * после закрытия фокус возвращается туда, откуда открыли.
 *
 * Использование: `const ref = useModal<HTMLDivElement>(isOpen, onClose)` и `ref` на контейнер
 * с role="dialog" aria-modal="true" (контейнер должен быть в DOM, пока isOpen).
 */
export function useModal<T extends HTMLElement>(open: boolean, onClose: () => void) {
	const ref = useRef<T>(null)
	const onCloseRef = useRef(onClose)
	useLayoutEffect(() => {
		onCloseRef.current = onClose
	})

	useEffect(() => {
		if (!open) return
		const previouslyFocused = document.activeElement as HTMLElement | null
		const root = ref.current

		// Только видимые элементы (у скрытых нет боксов).
		const focusables = () =>
			root ? Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.getClientRects().length > 0) : []

		// Первый интерактивный элемент; нет такого — сам контейнер (ему нужен tabIndex=-1).
		const first = focusables()[0]
		if (first) first.focus()
		else root?.focus()

		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				e.stopPropagation()
				onCloseRef.current()
				return
			}
			if (e.key !== 'Tab' || !root) return
			const items = focusables()
			if (items.length === 0) {
				e.preventDefault()
				root.focus()
				return
			}
			const firstEl = items[0]
			const lastEl = items[items.length - 1]
			const active = document.activeElement
			if (e.shiftKey && (active === firstEl || !root.contains(active))) {
				e.preventDefault()
				lastEl.focus()
			} else if (!e.shiftKey && (active === lastEl || !root.contains(active))) {
				e.preventDefault()
				firstEl.focus()
			}
		}
		document.addEventListener('keydown', onKeyDown)
		return () => {
			document.removeEventListener('keydown', onKeyDown)
			if (previouslyFocused && document.contains(previouslyFocused)) previouslyFocused.focus()
		}
	}, [open])

	return ref
}
