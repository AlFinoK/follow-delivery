// Демо «Скачать PDF» (§2.7 / §10): открывает печатную форму накладной в отдельном
// окне и вызывает печать браузера (Сохранить как PDF). В проде — серверный
// @react-pdf/renderer со встроенным кириллическим шрифтом.

import { fmtMoney, STATUS_LABELS, type Waybill } from '@/lib/demo/waybill'

export function openWaybillPrint(w: Waybill) {
	const win = window.open('', '_blank', 'width=820,height=1000')
	if (!win) return
	win.document.write(buildHtml(w))
	win.document.close()
	win.focus()
	// Небольшая задержка, чтобы стили применились до печати.
	setTimeout(() => win.print(), 300)
}

function esc(s: string): string {
	return (s || '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] as string)
}

function buildHtml(w: Waybill): string {
	const senderBlock =
		w.sender.type === 'company'
			? `${esc(w.sender.companyName)}${w.sender.companyTin ? ` (ИНН/БИН ${esc(w.sender.companyTin)})` : ''}${w.sender.contactPerson ? `, контакт: ${esc(w.sender.contactPerson)}` : ''}`
			: esc(w.sender.fullName)

	const row = (label: string, value: string) =>
		value ? `<tr><td class="lbl">${label}</td><td>${value}</td></tr>` : ''

	return `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<title>Накладная №${w.number ?? '—'}</title>
<style>
	* { box-sizing: border-box; }
	body { font-family: Arial, sans-serif; color: #0f172a; margin: 32px; font-size: 13px; }
	h1 { font-size: 20px; margin: 0 0 2px; }
	.sub { color: #64748b; font-size: 12px; margin-bottom: 18px; }
	.head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #f97316; padding-bottom: 12px; margin-bottom: 16px; }
	.num { text-align: right; }
	.num b { font-size: 22px; color: #ea580c; }
	table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
	td, th { border: 1px solid #e2e8f0; padding: 6px 8px; vertical-align: top; }
	.lbl { background: #f8fafc; font-weight: 600; width: 34%; color: #475569; }
	th { background: #f1f5f9; text-align: left; font-size: 12px; }
	.c { text-align: center; } .r { text-align: right; }
	h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .04em; color: #64748b; margin: 18px 0 6px; }
	.totals { display: flex; gap: 24px; font-size: 14px; margin: 8px 0 4px; }
	.totals b { color: #0f172a; }
	.sign { display: flex; justify-content: space-between; margin-top: 48px; gap: 40px; }
	.sign > div { flex: 1; border-top: 1px solid #94a3b8; padding-top: 6px; font-size: 12px; color: #64748b; text-align: center; }
	.stamp { margin-top: 40px; width: 150px; height: 150px; border: 2px dashed #cbd5e1; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 12px; text-align: center; }
	@media print { body { margin: 12mm; } .noprint { display: none; } }
</style></head><body>
<div class="head">
	<div><h1>Транспортная накладная</h1><div class="sub">Leader Trans Team (ЛТТ)</div></div>
	<div class="num">№ <b>${w.number ?? '—'}</b><div class="sub">Статус: ${STATUS_LABELS[w.status]}<br>Дата приёма: ${esc(w.acceptanceDate)}</div></div>
</div>

<h2>Отправитель</h2>
<table>${row('Отправитель', senderBlock)}${row('Адрес', esc(w.sender.address))}${row('Город / страна', `${esc(w.sender.city)}, ${esc(w.sender.country)}`)}</table>

<h2>Получатель</h2>
<table>${row('ФИО', esc(w.receiver.fullName))}${row('Телефон', esc(w.receiver.phone))}${row('ИНН / ИИН', esc(w.receiver.tin))}${row('Паспорт', esc(w.receiver.passport))}${row('Адрес доставки', esc(w.receiver.address))}${row('Город / страна', `${esc(w.receiver.city)}, ${esc(w.receiver.country)}`)}</table>

<h2>Оплата</h2>
<table>${row('Кто оплачивает', w.payer === 'sender' ? 'Отправитель' : 'Получатель')}${row('Способ оплаты', w.payMethod === 'cash' ? 'Наличный расчёт' : 'Безналичный расчёт')}${row('Сумма к оплате', `${fmtMoney(w.amount)} ₸`)}</table>

<div class="sign">
	<div class="stamp">М.П.<br>(печать ЛТТ)</div>
	<div>Подпись отправителя</div>
</div>
</body></html>`
}
