// Шаблон уведомления клиенту (§5 ТЗ + правка «Уведомить клиента»).
//
// Текст РУССКИЙ и в i18n не заводится — по той же причине, что и PDF накладной
// (CLAUDE.md §11): это документ для клиента, а не интерфейс оператора. Получатели —
// физлица в РФ, язык интерфейса админки на текст сообщения влиять не должен.
//
// Канал один — WhatsApp, текст полный, по образцу заказчика (эмодзи, блок про MAX,
// предупреждение об оплате).

import { COMPANY, trackUrl } from '@/lib/waybill/company'
// Импорт из totals.ts, а НЕ из model.ts: model.ts тянет react-phone-number-input,
// который ломает вычисление модуля в серверном рантайме (см. totals.ts).
import { fmtMoney } from '@/lib/waybill/totals'
import type { Waybill } from '@/lib/waybill/model'

/**
 * Телефон отдела доставки в виде «+7 708 703 7711».
 *
 * Берём из COMPANY, а не строкой в шаблоне: company.ts — единственное место правки
 * реквизитов, иначе номер в уведомлении и в PDF со временем разойдутся. В COMPANY он
 * записан как «8 708 703 77 11», поэтому приводим к международному виду.
 */
function contactPhone(): string {
	const digits = contactDigits()
	return digits.length === 10 ? `+7 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}` : deliveryDept()
}

function deliveryDept(): string {
	const dept = COMPANY.departments.find((d) => d.title.includes('доставки')) ?? COMPANY.departments[0]
	return dept?.phone ?? ''
}

const contactDigits = () => deliveryDept().replace(/\D/g, '').slice(-10)

/**
 * Полный текст для WhatsApp — по образцу заказчика, включая эмодзи и капслок в
 * предупреждении об оплате. Формулировки менять только по его слову.
 *
 * Подставляются три значения: номер накладной, город доставки и сумма. Блоки с
 * незаполненными полями выпадают целиком — иначе клиент получил бы «К оплате 0 тенге»
 * или пустую строку после «🔹».
 */
function whatsappText(w: Waybill): string {
	const blocks: string[] = [
		`Добрый день!\nВас Уведомляет Транспортная компания Leader Trans Team.`,
		`📲Убедительная просьба добавить меня в MAX для связи: ${contactPhone()}`,
		`✅ Груз принят к отправке.`,
		// Диплинк с номером: страница сама находит груз, клиенту не надо ничего
		// вводить руками. Без номера (черновик) остаётся ссылка на главную.
		`📦 Отслеживание по трек-номеру: ${trackUrl(w.number)}`,
	]

	const track = [
		w.number ? `🔹 Трек-номер (накладная):\n🔹  ${w.number}` : '',
		w.receiver.city.trim() ? `📍 ${w.receiver.city.trim()}` : '',
	].filter(Boolean)
	if (track.length) blocks.push(track.join('\n'))

	blocks.push(`ОПЛАТА ИСКЛЮЧИТЕЛЬНО НА КАРТУ ТРАНСПОРТНОЙ КОМПАНИИ В РУБЛЯХ!!!`)

	if (w.amount) {
		blocks.push(`💰 К оплате при получении:\n${fmtMoney(w.amount)} тенге\n(по курсу валюты на день оплаты)`)
	}

	blocks.push(
		`📌 Реквизиты — перед доставкой.\n🧮 Расчёт стоимости будущих грузов: ${COMPANY.site}\nС уважением, Leader Trans Team`
	)

	return blocks.join('\n\n')
}

/** Текст уведомления клиенту — для предпросмотра в модалке и для отправки. */
export function buildClientMessage(w: Waybill): string {
	return whatsappText(w)
}
