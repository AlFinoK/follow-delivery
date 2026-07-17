'use client'

import { use } from 'react'
import { CargoDetailPage } from '@/components/pages/CargoDetailPage'

export default function Page({ params }: { params: Promise<{ id: string }> }) {
	const { id } = use(params)
	return <CargoDetailPage id={id} />
}
