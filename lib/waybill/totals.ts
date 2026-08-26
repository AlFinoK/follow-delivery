// Итоги и форматтеры накладной — чистые функции без внешних зависимостей.
//
// Вынесено из [model.ts] ради СЕРВЕРА: model.ts импортирует
// `react-phone-number-input` (для isPhoneValid), а этот пакет при вычислении модуля
// в серверном рантайме Next падает с «Super expression must either be null or a
// function». Роут /api/notify собирает текст уведомления теми же формулами, что и
// UI, — и раньше валился на 500 только из-за этого импорта.
//
// Правило: всё, что нужно И серверу, И клиенту, живёт здесь. model.ts эти функции
// реэкспортирует, поэтому существующие импорты из model.ts продолжают работать.

export interface PositionTotals {
	quantity: number
	length: number // см
	width: number // см
	height: number // см
	weight: number // кг за место
	price: number // ₸ за единицу
}

/** Итоговый вес: Σ вес_места × кол-во. */
export function totalWeight(positions: PositionTotals[]): number {
	return positions.reduce((s, p) => s + (p.weight || 0) * (p.quantity || 0), 0)
}

/** Авто-объём из габаритов мест: Σ (Д×Ш×В см³ / 1e6) × кол-во → м³. */
export function autoVolume(positions: PositionTotals[]): number {
	return positions.reduce((s, p) => s + (((p.length || 0) * (p.width || 0) * (p.height || 0)) / 1_000_000) * (p.quantity || 0), 0)
}

/** Объём накладной: заданный вручную или посчитанный из габаритов. */
export function effectiveVolume(w: { manualVolume: boolean; volume: number; positions: PositionTotals[] }): number {
	return w.manualVolume ? w.volume : autoVolume(w.positions)
}

/** Общая себестоимость груза: Σ цена × кол-во, ₸. */
export function totalGoodsPrice(positions: PositionTotals[]): number {
	return positions.reduce((s, p) => s + (p.price || 0) * (p.quantity || 0), 0)
}

// ── Форматтеры под образец заказчика (п.3.3) ────────────────────────────────
// «35.000 тенге» — точка как разделитель тысяч; «1,911 м³», «245,0 кг» — запятая.

export function fmtMoney(n: number): string {
	// целое, разделитель тысяч — точка
	const int = Math.round(n)
	return int.toLocaleString('ru-RU').replace(/ |\s/g, '.')
}

export function fmtDecimal(n: number, digits = 3): string {
	return n.toFixed(digits).replace('.', ',')
}

export function trimNum(n: number): string {
	return Number.isInteger(n) ? String(n) : String(n).replace('.', ',')
}

export function fmtDims(p: PositionTotals): string {
	return `${trimNum(p.length)}x${trimNum(p.width)}x${trimNum(p.height)}`
}
