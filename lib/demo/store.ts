// Клиентское хранилище демо-песочницы. Живёт в sessionStorage (namespace demo:*),
// стартует ПУСТЫМ, чистится при закрытии вкладки. Никогда не касается реальной БД.
// Используется demoRepo ([lib/data/demoRepo.ts]) как источник данных под /demo.

import type { Cargo } from '@/components/admin/types'
import type { Preset } from '@/lib/calculator/presets'
import { DEFAULT_PRESETS } from '@/lib/calculator/presets'

export interface DemoFolder {
	id: string
	name: string
	createdAt: string
	updatedAt: string
}

const K = {
	cargos: 'demo:cargos',
	folders: 'demo:folders',
	presets: 'demo:presets',
	seq: 'demo:seq',
	seeded: 'demo:seeded',
} as const

function read<T>(key: string, fallback: T): T {
	if (typeof window === 'undefined') return fallback
	try {
		const raw = sessionStorage.getItem(key)
		return raw ? (JSON.parse(raw) as T) : fallback
	} catch {
		return fallback
	}
}

function write<T>(key: string, value: T): void {
	if (typeof window === 'undefined') return
	try {
		sessionStorage.setItem(key, JSON.stringify(value))
	} catch {
		/* quota / приватный режим — молча игнорируем в демо */
	}
}

// Монотонный счётчик для генерации id (docId/folderId) без Date.now-гонок в SSR.
function nextSeq(): number {
	const n = read<number>(K.seq, 0) + 1
	write(K.seq, n)
	return n
}

export function genId(prefix: string): string {
	return `${prefix}-${nextSeq()}`
}

// ── Грузы ─────────────────────────────────────────────────────────────────
export function getCargos(): Cargo[] {
	return read<Cargo[]>(K.cargos, [])
}
export function setCargos(list: Cargo[]): void {
	write(K.cargos, list)
}

// ── Папки ─────────────────────────────────────────────────────────────────
export function getFolders(): DemoFolder[] {
	return read<DemoFolder[]>(K.folders, [])
}
export function setFolders(list: DemoFolder[]): void {
	write(K.folders, list)
}

// ── Пресеты ───────────────────────────────────────────────────────────────
export function getPresets(): Preset[] {
	return read<Preset[]>(K.presets, [])
}
export function setPresets(list: Preset[]): void {
	write(K.presets, list)
}

/** Пресеты по умолчанию (те же, что и прод-сид), без обращения к БД. */
export function defaultDemoPresets(): Preset[] {
	return DEFAULT_PRESETS.map((p, i) => ({
		id: `demo-preset-${i + 1}`,
		name: p.name,
		category: p.category,
		length: p.length,
		width: p.width,
		height: p.height,
		weight: p.weight,
		basePrice: 0,
		imageUrl: null,
		sortOrder: p.sortOrder,
		active: true,
	}))
}

// ── Управление песочницей ──────────────────────────────────────────────────

/** Полная очистка демо-данных. */
export function resetDemo(): void {
	if (typeof window === 'undefined') return
	Object.values(K).forEach((k) => {
		try {
			sessionStorage.removeItem(k)
		} catch {
			/* noop */
		}
	})
}

const now = () => new Date().toISOString()

/** Наполнить песочницу правдоподобными демо-записями (кнопка «Заполнить примерами»). */
export function seedSampleData(): void {
	const created = now()
	const folder: DemoFolder = { id: genId('demo-folder'), name: 'Рейс Алматы → Москва', createdAt: created, updatedAt: created }

	const mk = (over: Partial<Cargo>): Cargo => ({
		docId: genId('demo-cargo'),
		id: `CARGO-${genId('D').toUpperCase()}`,
		cargoNumber: null,
		name: null,
		fromCity: 'Алматы',
		currentCity: 'Алматы',
		toCity: 'Москва',
		status: 'ожидает отправления',
		acceptanceDate: created,
		shipmentDate: null,
		deliveryTimeframe: null,
		deliveryAmount: null,
		paymentStatus: 'none',
		partialPaymentDetail: null,
		currency: 'KZT',
		folderId: null,
		createdAt: created,
		...over,
	})

	const sample: Cargo[] = [
		mk({ cargoNumber: 2081, name: 'Эндуро (мототехника)', currentCity: 'Астана', toCity: 'Омск', status: 'в пути', deliveryAmount: 504840, deliveryTimeframe: '5|days', folderId: folder.id }),
		mk({ cargoNumber: 2082, name: 'Домашние вещи', currentCity: 'Алматы', toCity: 'Казань', status: 'ожидает отправления', deliveryAmount: 120000, folderId: folder.id }),
		mk({ cargoNumber: 2080, name: 'Квадроцикл 500', currentCity: 'Новосибирск', toCity: 'Новосибирск', status: 'прибыл', deliveryAmount: 260000, paymentStatus: 'full' }),
	]

	setFolders([folder])
	setCargos(sample)
	setPresets(defaultDemoPresets())
	write(K.seeded, true)
}

/** Проставить пресеты по умолчанию, если ещё пусто (чтобы калькулятор/шаблоны не были пустыми). */
export function ensureDemoPresets(): Preset[] {
	let list = getPresets()
	if (list.length === 0) {
		list = defaultDemoPresets()
		setPresets(list)
	}
	return list
}
