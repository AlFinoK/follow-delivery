export interface Cargo {
	docId: string
	id: string
	cargoNumber?: number | null
	name?: string | null
	fromCity: string
	currentCity: string
	toCity: string
	status: string
	acceptanceDate?: string | null
	shipmentDate?: string | null
	deliveryTimeframe?: string | null
	deliveryAmount?: number | null
	paymentStatus?: string
	partialPaymentDetail?: string | null
	currency?: string
	folderId?: string | null
	/** Название папки, в которой лежит груз (для списка и поиска). null — не в папке. */
	folderName?: string | null
	/** ISO-строка из JSON (на сервере — Date до сериализации). */
	createdAt?: string | Date | null
}
