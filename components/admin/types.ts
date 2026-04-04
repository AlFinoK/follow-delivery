export interface Cargo {
	docId: string
	id: string
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
	createdAt: any
}

export interface CargoCardHandlers {
	onUpdateStatus: (docId: string, newStatus: string) => Promise<void>
	onUpdateCurrentCity: (docId: string, newCity: string) => Promise<void>
	onUpdateName: (docId: string, newName: string) => Promise<void>
	onUpdateField: (docId: string, field: string, value: string) => Promise<void>
	onUpdatePaymentStatus: (docId: string, newStatus: string) => Promise<void>
	onUpdateCurrency: (docId: string, newCurrency: string) => void
	onDelete: (docId: string) => Promise<void>
	onCopy: (id: string) => void
}

export interface CargoCardProps extends CargoCardHandlers {
	cargo: Cargo
	isCopied: boolean
}
