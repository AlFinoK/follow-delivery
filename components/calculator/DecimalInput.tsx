'use client'

import { useEffect, useRef, useState } from 'react'

interface DecimalInputProps {
	value: number
	onChange: (v: number) => void
	/** только целые (для количества/порядка) */
	integer?: boolean
	min?: number
	/** верхний предел; не задан — без ограничения (валюта и т.п. не зажимаются) */
	max?: number
	placeholder?: string
	className?: string
	ariaLabel?: string
}

/** Разбор строки с дробным числом: принимает и запятую, и точку, и ведущий минус. */
export function parseDecimal(raw: string): number {
	let s = raw.replace(/,/g, '.').replace(/[^0-9.-]/g, '')
	const neg = s.startsWith('-')
	s = (neg ? '-' : '') + s.replace(/-/g, '')
	// оставляем только первый десятичный разделитель
	const firstDot = s.indexOf('.')
	if (firstDot !== -1) {
		s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, '')
	}
	const n = Number(s)
	return Number.isFinite(n) ? n : 0
}

const formatNum = (n: number) => Number(n.toFixed(3)).toString()

/**
 * Числовой ввод с поддержкой дробных значений и запятой как разделителя
 * (ТЗ improves: «0,5 м», «0,8 м»). Хранит собственный текстовый буфер, чтобы не
 * терять ввод вида «0,» и не мешать набору; наружу отдаёт распарсенное число.
 * `max` не задаётся по умолчанию — значения не зажимаются молча (важно для цены).
 */
export function DecimalInput({
	value,
	onChange,
	integer = false,
	min = 0,
	max,
	placeholder = '0',
	className = '',
	ariaLabel,
}: DecimalInputProps) {
	const [text, setText] = useState(value === 0 ? '' : formatNum(value))
	// последнее значение, которое мы сами отдали наверх — чтобы отличать внешние
	// изменения value (автозаполнение, сброс) от собственного эха.
	const lastEmitted = useRef(value)

	useEffect(() => {
		if (value !== lastEmitted.current) {
			setText(value === 0 ? '' : formatNum(value))
			lastEmitted.current = value
		}
	}, [value])

	const handle = (raw: string) => {
		const allowNeg = min < 0
		let s = integer ? raw.replace(/[^0-9-]/g, '') : raw.replace(/[^0-9.,-]/g, '').replace(/,/g, '.')
		// разрешаем единственный ведущий минус только если min < 0
		const neg = allowNeg && s.trim().startsWith('-')
		s = (neg ? '-' : '') + s.replace(/-/g, '')
		if (!integer) {
			const firstDot = s.indexOf('.')
			if (firstDot !== -1) {
				s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, '')
			}
		}
		setText(s)

		let n = integer ? parseInt(s, 10) : parseDecimal(s)
		if (!Number.isFinite(n)) n = 0
		const parsed = n
		if (max !== undefined) n = Math.min(max, n)
		n = Math.max(min, n)
		// если зажали до границы — приводим буфер к каноничному значению (иначе на экране остаётся «вне диапазона»)
		if (n !== parsed) setText(n === 0 ? '' : formatNum(n))
		lastEmitted.current = n
		onChange(n)
	}

	return (
		<input
			type="text"
			inputMode="decimal"
			value={text}
			onChange={(e) => handle(e.target.value)}
			onFocus={(e) => e.currentTarget.select()}
			placeholder={placeholder}
			aria-label={ariaLabel}
			className={className}
		/>
	)
}
