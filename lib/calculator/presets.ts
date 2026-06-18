// ─────────────────────────────────────────────────────────────────────────────
// Пресеты грузов (готовая техника) для калькулятора.
//
// Модель (ТЗ improves): у каждого пресета — фиксированная БАЗОВАЯ стоимость (₸),
// которую задаёт администратор. Итог = база × количество, далее +30% по
// федеральному округу назначения (см. districts.ts) и не ниже MIN_PRICE_KZT.
// Базовая цена НЕ зависит от города по тарифным кривым (в отличие от «Свой груз»).
//
// Хранятся в БД (модель CargoPreset). DEFAULT_PRESETS — сид по умолчанию из ТЗ;
// базовая цена при сидировании оценивается движком (см. /api/presets/seed),
// дальше менеджеры правят её в админке.
// ─────────────────────────────────────────────────────────────────────────────

/** Пресет в том виде, как приходит из API/БД (размеры в см, вес в кг, цена в ₸). */
export interface Preset {
	id: string
	name: string
	category: string | null
	length: number
	width: number
	height: number
	weight: number
	/** базовая стоимость, ₸ (без региональной надбавки) */
	basePrice: number
	imageUrl: string | null
	sortOrder: number
	active: boolean
}

/** Сид-описание пресета (без цены — она оценивается/задаётся отдельно). */
export interface PresetSeed {
	name: string
	category: string
	length: number
	width: number
	height: number
	weight: number
	sortOrder: number
}

/** Объём пресета в м³ из габаритов в см. */
export const presetVolumeM3 = (p: { length: number; width: number; height: number }): number =>
	(p.length * p.width * p.height) / 1_000_000

/**
 * Стандартный набор пресетов из ТЗ. Размеры — в сантиметрах, вес — в кг.
 * sortOrder задаёт порядок отображения (лёгкая мототехника → квадроциклы по объёму).
 */
export const DEFAULT_PRESETS: PresetSeed[] = [
	{ name: 'Электровелосипед SK8', category: 'Электро', length: 130, width: 35, height: 60, weight: 35, sortOrder: 1 },
	{ name: 'Мопед', category: 'Мото', length: 180, width: 45, height: 80, weight: 160, sortOrder: 2 },
	{ name: 'Мотоцикл', category: 'Мото', length: 180, width: 45, height: 80, weight: 150, sortOrder: 3 },
	{ name: 'Питбайк', category: 'Мото', length: 129, width: 45, height: 62, weight: 95, sortOrder: 4 },
	{ name: 'Трицикл маленький', category: 'Трицикл', length: 120, width: 64, height: 64, weight: 60, sortOrder: 5 },
	{ name: 'Трицикл средний', category: 'Трицикл', length: 140, width: 70, height: 70, weight: 70, sortOrder: 6 },
	{ name: 'Трицикл большой', category: 'Трицикл', length: 170, width: 75, height: 80, weight: 80, sortOrder: 7 },
	{ name: 'Квадроцикл 200 куб. см', category: 'Квадроцикл', length: 190, width: 90, height: 90, weight: 260, sortOrder: 8 },
	{ name: 'Квадроцикл 300 куб. см', category: 'Квадроцикл', length: 200, width: 90, height: 90, weight: 280, sortOrder: 9 },
	{ name: 'Квадроцикл 350 куб. см', category: 'Квадроцикл', length: 205, width: 100, height: 90, weight: 300, sortOrder: 10 },
	{ name: 'Квадроцикл 400 куб. см', category: 'Квадроцикл', length: 210, width: 110, height: 90, weight: 350, sortOrder: 11 },
	{ name: 'Квадроцикл 500 куб. см', category: 'Квадроцикл', length: 215, width: 110, height: 100, weight: 450, sortOrder: 12 },
	{ name: 'Квадроцикл 600 куб. см', category: 'Квадроцикл', length: 220, width: 115, height: 100, weight: 480, sortOrder: 13 },
	{ name: 'Квадроцикл 650 куб. см', category: 'Квадроцикл', length: 220, width: 115, height: 100, weight: 480, sortOrder: 14 },
	{ name: 'Квадроцикл 700 куб. см', category: 'Квадроцикл', length: 220, width: 120, height: 100, weight: 500, sortOrder: 15 },
	{ name: 'Квадроцикл 1000 куб. см', category: 'Квадроцикл', length: 235, width: 140, height: 140, weight: 600, sortOrder: 16 },
]
