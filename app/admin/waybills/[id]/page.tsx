import { CreateWaybillPage } from '@/components/pages/CreateWaybillPage'

// Редактирование сохранённой накладной (ПРАВКИ 2, п.6).
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params
	return <CreateWaybillPage waybillId={id} />
}
