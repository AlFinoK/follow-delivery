// Печатная форма накладной («Скачать PDF»): открывает документ в отдельном окне и
// вызывает печать браузера (Сохранить как PDF).
//
// Содержимое по ПРАВКАМ 2:
//   п.2 — логотип, реквизиты и контакты ТК (отделы приёма/доставки, почта, сайт);
//   п.3 — строка о соответствии упаковки;
//   п.5 — дата отправки и сроки доставки.
// Реквизиты берутся из [lib/waybill/company.ts], логотип — /logo-ltt-ntk.svg.

import { COMPANY, trackUrl } from './company'
import {
	STATUS_LABELS,
	effectiveVolume,
	fmtDecimal,
	fmtDims,
	fmtMoney,
	totalWeight,
	trimNum,
	type Waybill,
} from './model'

export function openWaybillPrint(w: Waybill) {
	const win = window.open('', '_blank', 'width=880,height=1000')
	if (!win) return
	// Окно открыто как about:blank — относительный путь к логотипу в нём не
	// разрешится, поэтому подставляем абсолютный. Печать вызывает сам документ
	// по событию load: иначе диалог мог открыться до загрузки логотипа.
	win.document.write(buildHtml(w, window.location.origin))
	win.document.close()
	win.focus()
}

function esc(s: string): string {
	return (s || '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] as string)
}

/** 'YYYY-MM-DD' → 'ДД.ММ.ГГГГ'; пустое → «—». */
function ru(date: string): string {
	if (!date) return '—'
	const [y, m, d] = date.split('-')
	return y && m && d ? `${d}.${m}.${y}` : date
}

const UNITS: Record<string, string> = { days: 'дн.', weeks: 'нед.', months: 'мес.' }

/** «10|days» → «10 дн.» */
function timeframe(value: string): string {
	if (!value) return '—'
	const [n, unit] = value.split('|')
	return n ? `${n} ${UNITS[unit] ?? unit ?? ''}`.trim() : '—'
}

function buildHtml(w: Waybill, origin: string): string {
	const row = (label: string, value: string) =>
		value && value !== '—' ? `<tr><td class="lbl">${label}</td><td>${value}</td></tr>` : ''

	const senderBlock =
		w.sender.type === 'company'
			? `${esc(w.sender.companyName)}${w.sender.companyTin ? ` (ИНН/БИН ${esc(w.sender.companyTin)})` : ''}${
					w.sender.contactPerson ? `, контакт: ${esc(w.sender.contactPerson)}` : ''
				}`
			: esc(w.sender.fullName)

	// Позиции груза (то, что фактически принято к перевозке).
	// Себестоимость товара (Position.price) в накладную НЕ печатается — это внутренние
	// данные для сводки логистам, клиенту в документе их видеть не нужно.
	const positions = w.positions.filter((p) => p.name.trim() || p.quantity || p.weight || p.length)
	const positionRows = positions
		.map(
			(p, i) => `<tr>
			<td class="c">${i + 1}</td>
			<td>${esc(p.name) || '—'}</td>
			<td class="c">${trimNum(p.quantity)}</td>
			<td class="c">${p.length || p.width || p.height ? fmtDims(p) : '—'}</td>
			<td class="r">${p.weight ? `${trimNum(p.weight)} кг` : '—'}</td>
		</tr>`
		)
		.join('')

	// п.2 — блок реквизитов и контактов перевозчика. Пустые поля не печатаются,
	// поэтому достаточно дописать их в COMPANY.
	const legalLines = [COMPANY.legalName && esc(COMPANY.legalName), COMPANY.legalAddress && esc(COMPANY.legalAddress)]
		.filter(Boolean)
		.join('<br>')

	const contactLines = [
		...COMPANY.departments.map((d) => `${esc(d.title)}: <b>${esc(d.phone)}</b>`),
		`Почта: <b>${esc(COMPANY.email)}</b>`,
		`Отслеживание груза: <b>${esc(COMPANY.siteLabel)}</b>`,
	].join('<br>')

	// п.3 — соответствие упаковки прямо в документе. Обычным чёрным текстом, без
	// цветовой подсветки: строка не должна бросаться в глаза клиенту.
	const packaging = w.packagingOk
		? 'Упаковка соответствует требованиям перевозки'
		: 'Упаковка НЕ соответствует требованиям перевозки'

	return `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<title>Накладная №${w.number ?? '—'}</title>
<style>
	* { box-sizing: border-box; }
	body { font-family: Arial, sans-serif; color: #0f172a; margin: 28px; font-size: 12.5px; }
	h1 { font-size: 19px; margin: 0 0 2px; }
	.sub { color: #64748b; font-size: 11.5px; }
	.head { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; border-bottom: 2px solid #f97316; padding-bottom: 12px; margin-bottom: 14px; }
	.head img { width: 190px; height: auto; display: block; margin-bottom: 8px; }
	.num { text-align: right; white-space: nowrap; }
	.num b { font-size: 21px; color: #ea580c; }
	.carrier { display: flex; gap: 24px; justify-content: space-between; border: 1px solid #e2e8f0; background: #f8fafc; border-radius: 4px; padding: 9px 11px; margin-bottom: 16px; font-size: 11.5px; line-height: 1.55; }
	.carrier > div { flex: 1; }
	.carrier .t { font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: #64748b; font-size: 10px; margin-bottom: 3px; }
	table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
	td, th { border: 1px solid #e2e8f0; padding: 5px 8px; vertical-align: top; }
	.lbl { background: #f8fafc; font-weight: 600; width: 30%; color: #475569; }
	th { background: #f1f5f9; text-align: left; font-size: 11.5px; }
	.c { text-align: center; } .r { text-align: right; }
	h2 { font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: #64748b; margin: 16px 0 6px; }
	.totals { display: flex; flex-wrap: wrap; gap: 10px 26px; font-size: 13px; margin: 0 0 10px; }
	.pack { border: 1px solid #e2e8f0; border-radius: 4px; padding: 8px 11px; margin-bottom: 14px; font-size: 12.5px; color: #0f172a; }
	.note { color: #64748b; font-size: 11.5px; margin: 0 0 14px; }
	@page { margin: 12mm; }
	@media print { body { margin: 0; } .noprint { display: none; } }
</style></head><body>
<div class="head">
	<div>
		<img src="${origin}/logo-ltt-ntk.svg" alt="Leader Trans Team — НТК">
		<h1>Транспортная накладная</h1>
		<div class="sub">${esc(COMPANY.brand)}</div>
	</div>
	<div class="num">№ <b>${w.number ?? '—'}</b>
		<div class="sub">Статус: ${STATUS_LABELS[w.status]}<br>Дата приёма: ${ru(w.acceptanceDate)}</div>
	</div>
</div>

<div class="carrier">
	<div>
		<div class="t">Перевозчик</div>
		${legalLines || '—'}
	</div>
	<div>
		<div class="t">Контакты</div>
		${contactLines}
	</div>
</div>

<h2>Отправитель</h2>
<table>${row('Отправитель', senderBlock)}${row('Адрес', esc(w.sender.address))}${row('Город / страна', `${esc(w.sender.city)}, ${esc(w.sender.country)}`)}</table>

<h2>Получатель</h2>
<table>${row('ФИО', esc(w.receiver.fullName))}${row('Телефон', esc(w.receiver.phone))}${row('ИНН / ИИН', esc(w.receiver.tin))}${row('Паспорт', esc(w.receiver.passport))}${row('Адрес доставки', esc(w.receiver.address))}${row('Город / страна', `${esc(w.receiver.city)}, ${esc(w.receiver.country)}`)}</table>

<h2>Груз</h2>
<table>${row('Характер груза', esc(w.nature))}${row('Спец-инструкция', esc(w.specialInstructions))}</table>
${
	positionRows
		? `<table>
	<tr><th class="c" style="width:34px">№</th><th>Наименование</th><th class="c" style="width:66px">Кол-во</th><th class="c" style="width:130px">Габариты, см</th><th class="r" style="width:110px">Вес места</th></tr>
	${positionRows}
</table>`
		: ''
}
<div class="totals">
	<span>Мест: <b>${positions.reduce((s, p) => s + (p.quantity || 0), 0) || '—'}</b></span>
	<span>Общий вес: <b>${fmtDecimal(totalWeight(w.positions), 1)} кг</b></span>
	<span>Объём: <b>${fmtDecimal(effectiveVolume(w))} м³</b></span>
</div>

<div class="pack">${packaging}</div>

<h2>Оплата и сроки</h2>
<table>
	${row('Кто оплачивает', w.payer === 'sender' ? 'Отправитель' : 'Получатель')}
	${row('Способ оплаты', w.payMethod === 'cash' ? 'Наличный расчёт' : 'Безналичный расчёт')}
	${row('Сумма к оплате', `${fmtMoney(w.amount)} ₸`)}
	${row('Дата отправки груза', ru(w.shipmentDate))}
	${row('Сроки доставки', timeframe(w.deliveryTimeframe))}
</table>

<p class="note">Отследить груз: ${esc(trackUrl(w.number))}</p>
<script>
	// Печать после полной загрузки (важно для логотипа), с фолбэком по таймауту.
	var printed = false
	function go() { if (!printed) { printed = true; window.focus(); window.print() } }
	window.addEventListener('load', function () { setTimeout(go, 150) })
	setTimeout(go, 2500)
</script>
</body></html>`
}
