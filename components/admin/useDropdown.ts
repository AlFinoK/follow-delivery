'use client'

import { useState, useEffect, useRef } from 'react'

export function useDropdown(dropdownHeight = 220) {
	const [open, setOpen] = useState(false)
	const [upward, setUpward] = useState(false)
	const ref = useRef<HTMLDivElement>(null)

	const toggle = () => {
		if (!open && ref.current) {
			const rect = ref.current.getBoundingClientRect()
			setUpward(window.innerHeight - rect.bottom < dropdownHeight)
		}
		setOpen((v) => !v)
	}

	useEffect(() => {
		if (!open) return
		const handler = (e: MouseEvent) => {
			if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
		}
		document.addEventListener('mousedown', handler)
		return () => document.removeEventListener('mousedown', handler)
	}, [open])

	return { open, upward, toggle, setOpen, ref }
}
