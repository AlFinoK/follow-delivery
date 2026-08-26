// Шаблон уведомления клиенту (§5 ТЗ + правка «Уведомить клиента»).
//
// Текст РУССКИЙ и в i18n не заводится — по той же причине, что и PDF накладной
// (CLAUDE.md §11): это документ для клиента, а не интерфейс оператора. Получатели —
// физлица в РФ, язык интерфейса админки на текст сообщения влиять не должен.
//
// Вариантов текста два, и это принципиально:
//   whatsapp — полный, с маршрутом, весом, сроком и суммой (длина не тарифицируется);
//   sms      — короткий: кириллица в SMS идёт по 67 символов на часть, полный текст
//              разошёлся бы на 5 SMS. Оставлено только то, без чего уведомление
//              теряет смысл: номер накладной, срок и ссылка на отслеживание.

import { COMPANY, trackUrl } from '@/lib/waybill/company'
// Импорт из totals.ts, а НЕ из model.ts: model.ts тянет react-phone-number-input,
// который ломает вычисление модуля в серверном рантайме (см. totals.ts).
import { effectiveVolume, fmtMoney, totalWeight } from '@/lib/waybill/totals'
import type { Waybill } from '@/lib/waybill/model'
import type { NotifyChannel } from './types'

const UNITS: Record<string, string> = { days: 'дн.', weeks: 'нед.', months: 'мес.' }

/** «10|days» → «10 дн.»; пустое → ''. */
function timeframe(value: string): string {
	if (!value) return ''
	const [n, unit] = value.split('|')
	return n ? `${n} ${UNITS[unit] ?? unit ?? ''}`.trim() : ''
}

/** 'YYYY-MM-DD' → 'ДД.ММ.ГГГГ'; пустое → ''. */
function ru(date: string): string {
	if (!date) return ''
	const [y, m, d] = date.split('-')
	return y && m && d ? `${d}.${m}.${y}` : date
}

/** «1 место», «2 места», «5 мест» — сообщение читает клиент, а не логист. */
function plural(n: number, one: string, few: string, many: string): string {
	const m10 = n % 10
	const m100 = n % 100
	if (m10 === 1 && m100 !== 11) return one
	if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few
	return many
}

/** Первое слово имени — обращение «Здравствуйте, Иван!» вместо полного ФИО. */
function firstName(fullName: string): string {
	const parts = (fullName || '').trim().split(/\s+/).filter(Boolean)
	// В КЗ/РФ ФИО пишут «Фамилия Имя Отчество», поэтому имя — второе слово, если оно есть.
	return parts.length > 1 ? parts[1] : parts[0] || ''
}

/** Полный текст для WhatsApp. Пустые строки не попадают в сообщение. */
function whatsappText(w: Waybill): string {
	const name = firstName(w.receiver.fullName)
	const places = w.positions.reduce((s, p) => s + (p.quantity || 0), 0)
	const weight = totalWeight(w.positions)
	const volume = effectiveVolume(w)

	const cargo = [
		w.nature.trim(),
		places ? `${places} ${plural(places, 'место', 'места', 'мест')}` : '',
		weight ? `${weight.toFixed(1).replace('.', ',')} кг` : '',
		volume ? `${volume.toFixed(2).replace('.', ',')} м³` : '',
	]
		.filter(Boolean)
		.join(', ')

	const payer = w.payer === 'receiver' ? 'оплачивает получатель' : 'оплачивает отправитель'

	// Собираем блоками, а не одним списком строк: незаполненные поля просто выпадают
	// из своего блока и не оставляют пустой строки посреди сообщения.
	const greeting = [name ? `Здравствуйте, ${name}!` : 'Здравствуйте!', 'Ваш груз принят к перевозке — Leader Trans Team.']

	const details = [
		w.number ? `Накладная: №${w.number}` : '',
		`Маршрут: ${w.sender.city} → ${w.receiver.city}`,
		cargo ? `Груз: ${cargo}` : '',
		ru(w.shipmentDate) ? `Отправка: ${ru(w.shipmentDate)}` : '',
		timeframe(w.deliveryTimeframe) ? `Срок доставки: ${timeframe(w.deliveryTimeframe)}` : '',
		w.amount ? `К оплате: ${fmtMoney(w.amount)} тенге (${payer})` : '',
	].filter(Boolean)

	// Телефон берём из COMPANY, а не хардкодом: company.ts — единственное место правок
	// реквизитов, иначе номер в уведомлении и в PDF со временем разойдутся.
	const dept = COMPANY.departments.find((d) => d.title.includes('доставки')) ?? COMPANY.departments[0]
	const contacts = [`Отследить груз: ${trackUrl(w.number)}`, dept ? `${dept.title}: ${dept.phone}` : ''].filter(Boolean)

	return [greeting, details, contacts]
		.filter((block) => block.length > 0)
		.map((block) => block.join('\n'))
		.join('\n\n')
}

/** Короткий текст для SMS — влезает в 2 части. */
function smsText(w: Waybill): string {
	const parts = [
		`Leader Trans Team: груз принят.`,
		w.number ? `Накладная №${w.number}.` : '',
		timeframe(w.deliveryTimeframe) ? `Срок ${timeframe(w.deliveryTimeframe)}.` : '',
		trackUrl(w.number),
	]
	return parts.filter(Boolean).join(' ')
}

/** Текст уведомления под конкретный канал. */
export function buildClientMessage(w: Waybill, channel: NotifyChannel): string {
	return channel === 'sms' ? smsText(w) : whatsappText(w)
}

/** Оба варианта сразу — для предпросмотра в модалке и для фолбэка. */
export function buildClientMessages(w: Waybill): Record<NotifyChannel, string> {
	return { whatsapp: whatsappText(w), sms: smsText(w) }
}
