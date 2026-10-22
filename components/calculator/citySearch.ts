// Чистые помощники поиска пункта назначения в калькуляторе (CitySelect).

export const normalizeCityName = (s: string) => s.trim().toLowerCase().replace(/ё/g, 'е')

interface NamedPoint {
	name: string
	region: string
	code: string
}

/**
 * Убирает из выдачи справочника НП дубли городов-терминалов.
 *
 * Дубль — НП с тем же названием, что и терминал, который И ЕСТЬ этот город: его ближайший
 * терминал — тот же самый (code совпадает) или он в той же области. Такой пункт уже есть
 * в списке терминалов (точный тариф), а из справочника он выбрался бы с пометкой «примерно».
 *
 * Одноимённые НП в ДРУГИХ областях — не дубли и остаются: раньше фильтр шёл по одному
 * названию и прятал, например, Железногорск (Красноярский край) или Киров (Калужская
 * область) — выбрать их было нельзя вовсе, предлагался только терминал на другом конце страны.
 * (Область сверяется дополнительно, т.к. у части терминалов координаты стоят не в центре:
 * НП «Россошь» Воронежской области ближе к терминалу Острогожска, чем к своему.)
 */
export function dedupeSettlements<T extends NamedPoint>(places: T[], terminals: readonly NamedPoint[]): T[] {
	const byName = new Map<string, NamedPoint[]>()
	for (const d of terminals) {
		const key = normalizeCityName(d.name)
		const list = byName.get(key)
		if (list) list.push(d)
		else byName.set(key, [d])
	}
	return places.filter((p) => {
		const same = byName.get(normalizeCityName(p.name))
		if (!same) return true
		return !same.some((d) => d.code === p.code || normalizeCityName(d.region) === normalizeCityName(p.region))
	})
}
