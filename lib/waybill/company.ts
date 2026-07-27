// Реквизиты и контакты транспортной компании для печатной формы накладной
// (ПРАВКИ 2, п.2). Единственное место, где они заданы — правки вносить здесь.
// Пустая строка = строка просто не печатается.
//
// БИН и банковские реквизиты в накладной НЕ печатаются — по решению заказчика.

export const COMPANY = {
	/** Короткое имя бренда в шапке накладной. */
	brand: 'Leader Trans Team — НТК',
	/** Полное юридическое наименование. */
	legalName: 'ТОО «Leader Trans Team»',
	/** Адрес. */
	legalAddress: 'Казахстан, г. Алматы, ул. Казыбаева, 44',

	/** Гостевой сайт (отслеживание груза). */
	site: 'https://follow-delivery.vercel.app/',
	siteLabel: 'follow-delivery.vercel.app',
	email: 'd.torochkin@ltt.kz',

	/** Телефоны отделов (ПРАВКИ 2, п.2). */
	departments: [
		{ title: 'Отдел приёма груза', phone: '8 708 145 68 24' },
		{ title: 'Отдел доставки груза', phone: '8 708 703 77 11' },
	],
} as const

/** Ссылка на отслеживание конкретной накладной на гостевом сайте. */
export function trackUrl(number: number | null): string {
	return number ? `${COMPANY.site}?id=${number}` : COMPANY.site
}
