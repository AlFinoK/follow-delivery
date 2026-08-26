import { WaybillDetailPage } from '@/components/pages/WaybillDetailPage'

// Карточка накладной: сначала детальный просмотр, редактирование — по «карандашу»
// (`?edit=1`), как в карточке груза. Сам редактор — мастер CreateWaybillPage.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params
	return <WaybillDetailPage id={id} />
}
