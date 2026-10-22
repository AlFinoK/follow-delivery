// Разбор номеров грузов из строки ввода («3001, 3002 №3003 #3004»).
//
// Разделители — пробелы, запятые, точки с запятой. Перед числом допускается «№» или «#»:
// оператор копирует номер из накладной/сообщения именно в таком виде. Дубли убираются,
// нечисла и числа ≤ 0 отбрасываются.

export function parseCargoNumbers(raw: string): number[] {
	return Array.from(
		new Set(
			raw
				.split(/[\s,;]+/)
				.map((s) => s.trim().replace(/^[№#]+/, ''))
				.filter(Boolean)
				.map((s) => Number(s))
				.filter((n) => Number.isInteger(n) && n > 0)
		)
	)
}
