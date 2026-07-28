// Печатная форма накладной («Скачать PDF»): открывает документ в отдельном окне и
// вызывает печать браузера (Сохранить как PDF).
//
// Содержимое по ПРАВКАМ 2:
//   п.2 — логотип, реквизиты и контакты ТК (отделы приёма/доставки, почта, сайт);
//   п.3 — строка о соответствии упаковки;
//   п.5 — дата отправки и сроки доставки.
// Реквизиты берутся из [lib/waybill/company.ts], логотип — /logo-ltt-ntk.svg.

import { COMPANY, trackUrl } from './company'
import { STATUS_LABELS, effectiveVolume, fmtDecimal, fmtMoney, totalWeight, type Waybill } from './model'

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

	// В накладной груз описывается ОБОБЩЁННО: характер груза + мест/вес/объём.
	// Конкретные наименования («Электровелосипед», «Трицикл») и себестоимость товара
	// в документ не попадают — это внутренние данные, они остаются в сводке логистам.
	const positions = w.positions.filter((p) => p.name.trim() || p.quantity || p.weight || p.length)
	const places = positions.reduce((s, p) => s + (p.quantity || 0), 0)

	// п.2 — блок реквизитов и контактов перевозчика. Пустые поля не печатаются,
	// поэтому достаточно дописать их в COMPANY.
	const legalLines = [COMPANY.legalName && esc(COMPANY.legalName), COMPANY.legalAddress && esc(COMPANY.legalAddress)]
		.filter(Boolean)
		.join('<br>')

	// Контакты разложены в две колонки (телефоны | почта и сайт): в один столбец это
	// четыре строки, и документ переставал влезать в лист.
	const phoneLines = COMPANY.departments.map((d) => `${esc(d.title)}: <b>${esc(d.phone)}</b>`).join('<br>')
	const webLines = [`Почта: <b>${esc(COMPANY.email)}</b>`, `Отслеживание: <b>${esc(COMPANY.siteLabel)}</b>`].join('<br>')

	// п.3 — соответствие упаковки прямо в документе. Обычным чёрным текстом, без
	// цветовой подсветки: строка не должна бросаться в глаза клиенту.
	const packaging = w.packagingOk
		? 'Упаковка соответствует требованиям перевозки'
		: 'Упаковка НЕ соответствует требованиям перевозки'

	return `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<title>Накладная №${w.number ?? '—'}</title>
<style>
	* { box-sizing: border-box; }
	/* Поля страницы делаем padding'ом на body, а @page margin оставляем нулевым:
	   иначе Chrome печатает в этих полях свои колонтитулы — URL, дату и «Стр. 1 из 1».
	   Горизонтальные 20mm держат ширину содержимого на согласованных ~170мм.
	   width: 210mm — чтобы вёрстка на экране совпадала с печатной: только тогда
	   скрипт внизу может честно измерить, влезает ли документ в одну страницу. */
	body { font-family: Arial, sans-serif; color: #0f172a; margin: 0 auto; width: 210mm; padding: 16mm 20mm 11mm; font-size: 12.5px; }
	h1 { font-size: 19px; margin: 0 0 2px; }
	.sub { color: #64748b; font-size: 11.5px; }
	.head { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; border-bottom: 2px solid #f97316; padding-bottom: 9px; margin-bottom: 11px; }
	.head img { width: 190px; height: auto; display: block; margin-bottom: 6px; }
	.num { text-align: right; white-space: nowrap; }
	.num b { font-size: 21px; color: #ea580c; }
	.carrier { display: flex; gap: 18px; justify-content: space-between; border: 1px solid #e2e8f0; background: #f8fafc; border-radius: 4px; padding: 8px 11px; margin-bottom: 11px; font-size: 11.5px; line-height: 1.5; }
	.carrier > div { flex: 1; }
	.carrier .t { font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: #64748b; font-size: 10px; margin-bottom: 3px; }
	/* Телефон и почта не должны рваться на середине — перенос идёт по подписи. */
	.carrier b { white-space: nowrap; }
	table { width: 100%; border-collapse: collapse; margin-bottom: 9px; }
	td, th { border: 1px solid #e2e8f0; padding: 4px 8px; vertical-align: top; }
	.lbl { background: #f8fafc; font-weight: 600; width: 30%; color: #475569; }
	th { background: #f1f5f9; text-align: left; font-size: 11.5px; }
	.c { text-align: center; } .r { text-align: right; }
	h2 { font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: #64748b; margin: 11px 0 5px; }
	.totals { display: flex; flex-wrap: wrap; gap: 10px 26px; font-size: 13px; margin: 0 0 10px; }
	.pack { border: 1px solid #e2e8f0; border-radius: 4px; padding: 7px 11px; margin-bottom: 9px; font-size: 12.5px; color: #0f172a; }
	.note { color: #64748b; font-size: 11.5px; margin: 0 0 8px; }
	/* Печать организации — настоящий оттиск (/stamp.png: фото штампа с вырезанной
	   бумагой, выровненное по горизонту). Ставим ровно: рядом с линиями таблиц любой
	   наклон читается как перекос документа. */
	.stamp { margin-top: 9px; display: flex; justify-content: flex-end; }
	.stamp img { width: 56mm; height: auto; }
	@page { size: A4; margin: 0; }
	@media print { .noprint { display: none; } }
</style></head><body>
<div id="page"><div id="sheet">
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
		${phoneLines}
	</div>
	<div>
		<div class="t">Связь</div>
		${webLines}
	</div>
</div>

<h2>Отправитель</h2>
<table>${row('Отправитель', senderBlock)}${row('Адрес', esc(w.sender.address))}${row('Город / страна', `${esc(w.sender.city)}, ${esc(w.sender.country)}`)}</table>

<h2>Получатель</h2>
<table>${row('ФИО', esc(w.receiver.fullName))}${row('Телефон', esc(w.receiver.phone))}${row('ИНН / ИИН', esc(w.receiver.tin))}${row('Паспорт', esc(w.receiver.passport))}${row('Адрес доставки', esc(w.receiver.address))}${row('Город / страна', `${esc(w.receiver.city)}, ${esc(w.receiver.country)}`)}</table>

<h2>Груз</h2>
<table>
	${row('Характер груза', esc(w.nature))}
	${row('Мест', places ? String(places) : '')}
	${row('Общий вес', `${fmtDecimal(totalWeight(w.positions), 1)} кг`)}
	${row('Объём', `${fmtDecimal(effectiveVolume(w))} м³`)}
	${row('Спец-инструкция', esc(w.specialInstructions))}
</table>

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

<div class="stamp"><img src="${origin}${COMPANY.stampImage}" alt="Печать организации"></div>
</div></div>
<script>
	// Гарантия одной страницы (жалоба заказчика: документ печатался на двух листах).
	// В норме документ влезает с запасом и здесь ничего не происходит. Если содержимое
	// всё же выше листа (очень длинные адреса, простыня спец-инструкций), лист жёстко
	// ограничивается по высоте, а содержимое масштабируется под него — вторая страница
	// невозможна, при этом ничего не обрезается.
	// Вёрстка на экране совпадает с печатной (body: 210mm), поэтому измерения честные.
	function fit() {
		var A4 = 297 / 25.4 * 96 // высота листа в CSS-пикселях
		var sheet = document.getElementById('sheet')
		if (!sheet) return
		var cs = getComputedStyle(document.body)
		var avail = A4 - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
		var k = 1
		for (var i = 0; i < 10; i++) {
			// ширину компенсируем обратным коэффициентом, иначе после сжатия справа
			// оставалось бы пустое поле
			sheet.style.width = 100 / k + '%'
			if (sheet.scrollHeight * k <= avail) break
			if (k <= 0.78) break
			k = Math.max(0.78, k - 0.03)
		}
		if (k < 1) {
			sheet.style.transformOrigin = 'top left'
			sheet.style.transform = 'scale(' + k + ')'
			// Жёсткая высота ставится на обёртку, а не на body: у body/html переполнение
			// пробрасывается на вьюпорт и Chrome при печати всё равно добавлял лист.
			var wrap = document.getElementById('page')
			wrap.style.height = avail - 1 + 'px'
			wrap.style.overflow = 'hidden'
		} else {
			sheet.style.width = ''
		}
	}
	// Печать после полной загрузки (важно для логотипа и печати), с фолбэком по таймауту.
	var printed = false
	function go() { if (!printed) { printed = true; fit(); window.focus(); window.print() } }
	window.addEventListener('load', function () { setTimeout(go, 150) })
	setTimeout(go, 2500)
</script>
</body></html>`
}
