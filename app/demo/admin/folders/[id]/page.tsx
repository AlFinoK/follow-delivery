'use client'

import { use } from 'react'
import { FolderDetailPage } from '@/components/pages/FolderDetailPage'

export default function Page({ params }: { params: Promise<{ id: string }> }) {
	const { id } = use(params)
	return <FolderDetailPage id={id} />
}
