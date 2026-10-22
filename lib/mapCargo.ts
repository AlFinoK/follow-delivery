// Преобразование Prisma-сущности Cargo в публичный JSON.
// Важно: меняет местами поля — cargo.id (cuid) → docId, cargo.trackingId → id.
// На фронте: cargo.id = трек-номер "CARGO-...", cargo.docId = primary key для PATCH/DELETE.

export interface CargoRow {
	id: string
	trackingId: string
	cargoNumber: number | null
	name: string | null
	fromCity: string
	currentCity: string
	toCity: string
	status: string
	acceptanceDate: Date | null
	shipmentDate: Date | null
	deliveryTimeframe: string | null
	deliveryAmount: number | null
	paymentStatus: string
	partialPaymentDetail: string | null
	currency: string
	folderId: string | null
	// Подтягивается через include: { folder: { select: { name: true } } } там, где
	// название папки нужно показать (список грузов и карточка груза).
	folder?: { name: string } | null
	createdAt: Date
}

/**
 * Публичный DTO для поиска по трек-номеру (без авторизации). Намеренно УЖЕ, чем mapCargo:
 * без docId (primary key для PATCH/DELETE), folderId/folderName и cargoNumber — это
 * внутренние данные, посторонним их отдавать незачем. id = трек-номер, как и в mapCargo.
 */
export function mapPublicCargo(cargo: CargoRow) {
	return {
		id: cargo.trackingId,
		name: cargo.name,
		fromCity: cargo.fromCity,
		currentCity: cargo.currentCity,
		toCity: cargo.toCity,
		status: cargo.status,
		acceptanceDate: cargo.acceptanceDate ? cargo.acceptanceDate.toISOString() : null,
		shipmentDate: cargo.shipmentDate ? cargo.shipmentDate.toISOString() : null,
		deliveryTimeframe: cargo.deliveryTimeframe,
		deliveryAmount: cargo.deliveryAmount,
		paymentStatus: cargo.paymentStatus,
		partialPaymentDetail: cargo.partialPaymentDetail,
		currency: cargo.currency,
		createdAt: cargo.createdAt,
	}
}

export function mapCargo(cargo: CargoRow) {
	return {
		docId: cargo.id,
		id: cargo.trackingId,
		cargoNumber: cargo.cargoNumber,
		name: cargo.name,
		fromCity: cargo.fromCity,
		currentCity: cargo.currentCity,
		toCity: cargo.toCity,
		status: cargo.status,
		acceptanceDate: cargo.acceptanceDate ? cargo.acceptanceDate.toISOString() : null,
		shipmentDate: cargo.shipmentDate ? cargo.shipmentDate.toISOString() : null,
		deliveryTimeframe: cargo.deliveryTimeframe,
		deliveryAmount: cargo.deliveryAmount,
		paymentStatus: cargo.paymentStatus,
		partialPaymentDetail: cargo.partialPaymentDetail,
		currency: cargo.currency,
		folderId: cargo.folderId,
		folderName: cargo.folder?.name ?? null,
		createdAt: cargo.createdAt,
	}
}
