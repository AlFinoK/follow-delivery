// ─────────────────────────────────────────────────────────────────────────────
// Сборка справочника населённых пунктов РФ для калькулятора (одноразовый билд).
//
// Источник: GeoNames RU.txt (export/dump), класс P (populated places).
// Для каждого НП:
//   • кириллическое название берём из alternatenames (поле name романизировано);
//   • регион/округ — по admin1-коду (карта ADMIN1 ниже);
//   • ближайший город-терминал — по гаверсинусу к координатам терминалов
//     (directions.json, минус блок-лист);
//   • дубли (имя+регион) схлопываем, оставляя самый населённый.
// Результат → lib/calculator/settlements.json (компактный, интернированные строки).
//
// Запуск:  node scripts/build-settlements.mjs <путь к RU.txt>
// ─────────────────────────────────────────────────────────────────────────────

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const ROOT = process.cwd()
const TXT = process.argv[2] || path.join(process.env.TEMP || '/tmp', 'geonames', 'RU.txt')
const OUT = path.join(ROOT, 'lib', 'calculator', 'settlements.json')

// admin1-код GeoNames → [округ, русское название региона]
const ADMIN1 = {
	'88': ['central', 'Ярославская область'],
	'86': ['central', 'Воронежская область'],
	'85': ['northwest', 'Вологодская область'],
	'84': ['south', 'Волгоградская область'],
	'81': ['volga', 'Ульяновская область'],
	'80': ['volga', 'Удмуртская Республика'],
	'77': ['central', 'Тверская область'],
	'76': ['central', 'Тульская область'],
	'73': ['volga', 'Республика Татарстан'],
	'72': ['central', 'Тамбовская область'],
	'70': ['caucasus', 'Ставропольский край'],
	'69': ['central', 'Смоленская область'],
	'67': ['volga', 'Саратовская область'],
	'65': ['volga', 'Самарская область'],
	'62': ['central', 'Рязанская область'],
	'61': ['south', 'Ростовская область'],
	'60': ['northwest', 'Псковская область'],
	'90': ['volga', 'Пермский край'],
	'57': ['volga', 'Пензенская область'],
	'56': ['central', 'Орловская область'],
	'55': ['volga', 'Оренбургская область'],
	'52': ['northwest', 'Новгородская область'],
	'68': ['caucasus', 'Республика Северная Осетия — Алания'],
	'50': ['northwest', 'Ненецкий автономный округ'],
	'49': ['northwest', 'Мурманская область'],
	'48': ['central', 'Москва'],
	'47': ['central', 'Московская область'],
	'46': ['volga', 'Республика Мордовия'],
	'45': ['volga', 'Республика Марий Эл'],
	'43': ['central', 'Липецкая область'],
	'42': ['northwest', 'Ленинградская область'],
	'66': ['northwest', 'Санкт-Петербург'],
	'41': ['central', 'Курская область'],
	'38': ['south', 'Краснодарский край'],
	'37': ['central', 'Костромская область'],
	'34': ['northwest', 'Республика Коми'],
	'33': ['volga', 'Кировская область'],
	'28': ['northwest', 'Республика Карелия'],
	'27': ['caucasus', 'Карачаево-Черкесская Республика'],
	'25': ['central', 'Калужская область'],
	'24': ['south', 'Республика Калмыкия'],
	'23': ['northwest', 'Калининградская область'],
	'22': ['caucasus', 'Кабардино-Балкарская Республика'],
	'21': ['central', 'Ивановская область'],
	'19': ['caucasus', 'Республика Ингушетия'],
	'51': ['volga', 'Нижегородская область'],
	'17': ['caucasus', 'Республика Дагестан'],
	'16': ['volga', 'Чувашская Республика'],
	'12': ['caucasus', 'Чеченская Республика'],
	'10': ['central', 'Брянская область'],
	'09': ['central', 'Белгородская область'],
	'08': ['volga', 'Республика Башкортостан'],
	'07': ['south', 'Астраханская область'],
	'06': ['northwest', 'Архангельская область'],
	'01': ['south', 'Республика Адыгея'],
	'83': ['central', 'Владимирская область'],
	'87': ['ural', 'Ямало-Ненецкий автономный округ'],
	'78': ['ural', 'Тюменская область'],
	'79': ['siberia', 'Республика Тыва'],
	'75': ['siberia', 'Томская область'],
	'71': ['ural', 'Свердловская область'],
	'54': ['siberia', 'Омская область'],
	'53': ['siberia', 'Новосибирская область'],
	'40': ['ural', 'Курганская область'],
	'91': ['siberia', 'Красноярский край'],
	'32': ['ural', 'Ханты-Мансийский автономный округ'],
	'31': ['siberia', 'Республика Хакасия'],
	'29': ['siberia', 'Кемеровская область'],
	'03': ['siberia', 'Республика Алтай'],
	'13': ['ural', 'Челябинская область'],
	'04': ['siberia', 'Алтайский край'],
	'63': ['fareast', 'Республика Саха (Якутия)'],
	'59': ['fareast', 'Приморский край'],
	'30': ['fareast', 'Хабаровский край'],
	'20': ['siberia', 'Иркутская область'],
	'89': ['fareast', 'Еврейская автономная область'],
	'05': ['fareast', 'Амурская область'],
	'11': ['fareast', 'Республика Бурятия'],
	'64': ['fareast', 'Сахалинская область'],
	'44': ['fareast', 'Магаданская область'],
	'92': ['fareast', 'Камчатский край'],
	'15': ['fareast', 'Чукотский автономный округ'],
	'93': ['fareast', 'Забайкальский край'],
}

// Крым и Севастополь в GeoNames лежат в дампе Украины (UA), admin1: 11 — Крым, 20 — Севастополь.
// По ТЗ относятся к Южному ФО (+30%).
const CRIMEA = {
	'11': ['south', 'Республика Крым'],
	'20': ['south', 'Севастополь'],
}

const DISTRICTS = ['central', 'northwest', 'south', 'caucasus', 'volga', 'ural', 'siberia', 'fareast']

// блок-лист направлений (как в config.ts) — нельзя выбирать как ближайший терминал
const EXCL = [
	'калининград', 'днр', 'лнр', 'донецк', 'луганск', 'макеевк', 'горловк', 'мариупол', 'енакиев',
	'снежн', 'торез', 'шахтёрск', 'шахтерск', 'херсон', 'запорож', 'мелитопол', 'бердянск', 'новые территории',
]
const norm = (s) => s.trim().toLowerCase().replace(/ё/g, 'е')

const dirs = JSON.parse(fs.readFileSync(path.join(ROOT, 'lib', 'calculator', 'directions.json'), 'utf8'))
const terminals = dirs.filter((d) => !EXCL.some((p) => norm(d.name).includes(norm(p))))

const toRad = (d) => (d * Math.PI) / 180
function haversine(la1, lo1, la2, lo2) {
	const dLa = toRad(la2 - la1)
	const dLo = toRad(lo2 - lo1)
	const a = Math.sin(dLa / 2) ** 2 + Math.cos(toRad(la1)) * Math.cos(toRad(la2)) * Math.sin(dLo / 2) ** 2
	return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(a)))
}
function nearestCode(lat, lng) {
	let best = terminals[0]
	let bd = Infinity
	for (const t of terminals) {
		const d = haversine(lat, lng, t.lat, t.lng)
		if (d < bd) {
			bd = d
			best = t
		}
	}
	return best.code
}

const CYR = /[А-Яа-яЁё]/
// только русская кириллица (отсекает осетинские/чувашские/татарские варианты с æ, ĕ, ç, ў…)
const RU_ONLY = /^[А-Яа-яЁё0-9 \-’'«»().]+$/
const SKIP_CODES = new Set(['PPLQ', 'PPLH', 'PPLW']) // покинутые/исторические/разрушенные

// грубая транслитерация рус→лат для сопоставления с asciiname GeoNames
const TR = {
	а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l',
	м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch',
	ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
}
const translit = (s) => s.toLowerCase().split('').map((ch) => (ch in TR ? TR[ch] : ch)).join('')
const normLat = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

// экзонимы: у крупных городов поле name в GeoNames — английское (Moscow…), а не кириллица
const EXONYM = {
	moscow: 'Москва',
	saintpetersburg: 'Санкт-Петербург',
	stpetersburg: 'Санкт-Петербург',
	saintpetersburgh: 'Санкт-Петербург',
}

// выбираем русское название НП:
//  1) официальное поле name, если это чистая русская кириллица (так у большинства крупных городов);
//  2) известный экзоним (Moscow → Москва);
//  3) среди чисто-русских alt — ближайшее по транслитерации к asciiname, при ничьей берём более длинное
//     (полную форму: «Пермь», а не «Перм»).
function pickRuName(c) {
	const official = c[1] && CYR.test(c[1]) && RU_ONLY.test(c[1]) ? c[1].trim() : ''
	if (official) return official
	const ex = EXONYM[normLat(c[1] || '')] || EXONYM[normLat(c[2] || '')]
	if (ex) return ex
	const alts = (c[3] || '').split(',').map((a) => a.trim()).filter((a) => a && RU_ONLY.test(a))
	if (alts.length === 0) return ''
	const target = normLat(c[2] || c[1])
	// неrussian/дореформенная орфография: хвостовой ъ (Новосибирьскъ);
	// мягкий знак при к/г/х/ц на конце — «Мурманскь»; украинское «-ськ/-цьк» — «Мурманськ»
	const archaic = (s) => /ъ$/.test(s) || /[кгхц]ь$/.test(s) || /ьк$/.test(s)
	let best = alts[0]
	let bestScore = -1
	let bestArch = 1
	for (const cand of alts) {
		const tl = normLat(translit(cand))
		let score = 0
		if (target && tl === target) score = 3
		else if (target && (tl.startsWith(target) || target.startsWith(tl))) score = 2
		else if (target && (tl.includes(target) || target.includes(tl))) score = 1
		const arch = archaic(cand) ? 1 : 0
		// при равном score: сначала не-архаичные, затем более длинная (полная) форма
		const better =
			score > bestScore ||
			(score === bestScore && arch < bestArch) ||
			(score === bestScore && arch === bestArch && cand.length > best.length)
		if (better) {
			bestScore = score
			bestArch = arch
			best = cand
		}
	}
	return best
}

// схлопывание дублей по «имя|регион», оставляем самый населённый
const byKey = new Map()
let scanned = 0
let kept = 0

// Обработка одного дампа GeoNames: adm1Map — карта «admin1-код → [округ, регион]»;
// строки с admin1 вне карты пропускаются (так из UA берём только Крым/Севастополь).
function processSource(txtPath, adm1Map) {
	if (!fs.existsSync(txtPath)) return
	const lines = fs.readFileSync(txtPath, 'utf8').split('\n')
	for (const l of lines) {
		if (!l) continue
		const c = l.split('\t')
		if (c[6] !== 'P') continue
		if (SKIP_CODES.has(c[7])) continue
		const meta = adm1Map[c[10]]
		if (!meta) continue
		scanned++

		const name = pickRuName(c).trim()
		if (!name) continue

		const lat = parseFloat(c[4])
		const lng = parseFloat(c[5])
		if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
		const pop = parseInt(c[14] || '0', 10) || 0

		const [district, region] = meta
		const key = name + '|' + region
		const prev = byKey.get(key)
		if (!prev || pop > prev.pop) {
			byKey.set(key, { name, region, district, lat, lng, pop })
			if (!prev) kept++
		}
	}
}

// RU: все регионы из ADMIN1, кроме Калининградской области (доставка исключена)
const RU_MAP = Object.fromEntries(Object.entries(ADMIN1).filter(([code]) => code !== '23'))
processSource(TXT, RU_MAP)
// UA-дамп: только Крым (11) и Севастополь (20) → Южный ФО
const UA_TXT = path.join(path.dirname(TXT), 'UA.txt')
processSource(UA_TXT, CRIMEA)

// интернирование строк
const regions = []
const regionIdx = new Map()
const codes = []
const codeIdx = new Map()
const ri = (r) => {
	if (!regionIdx.has(r)) {
		regionIdx.set(r, regions.length)
		regions.push(r)
	}
	return regionIdx.get(r)
}
const ci = (c) => {
	if (!codeIdx.has(c)) {
		codeIdx.set(c, codes.length)
		codes.push(c)
	}
	return codeIdx.get(c)
}

const items = []
for (const s of byKey.values()) {
	const code = nearestCode(s.lat, s.lng)
	// [name, regionIdx, districtIdx, codeIdx, pop]
	items.push([s.name, ri(s.region), DISTRICTS.indexOf(s.district), ci(code), s.pop])
}

// сортировка по населению убыв., затем по имени — лучшие совпадения раньше
items.sort((a, b) => b[4] - a[4] || a[0].localeCompare(b[0], 'ru'))

const out = { regions, codes, districts: DISTRICTS, items }
fs.writeFileSync(OUT, JSON.stringify(out))

const bytes = fs.statSync(OUT).size
console.log('scanned P (eligible):', scanned)
console.log('unique settlements:', items.length)
console.log('regions:', regions.length, '| terminals used:', codes.length)
console.log('output:', OUT, '|', (bytes / 1024 / 1024).toFixed(1), 'MB')
console.log('samples:', items.slice(0, 5).map((i) => i[0] + ' (' + regions[i[1]] + ' → ' + codes[i[3]] + ')').join('; '))
