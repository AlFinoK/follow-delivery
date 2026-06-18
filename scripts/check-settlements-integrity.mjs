import settle from '../lib/calculator/settlements.json' with { type: 'json' }
import dirs from '../lib/calculator/directions.json' with { type: 'json' }

// блок-лист как в config.ts
const EXCL = ['калининград','днр','лнр','донецк','луганск','макеевк','горловк','мариупол','енакиев','снежн','торез','шахтёрск','шахтерск','херсон','запорож','мелитопол','бердянск','новые территории']
const norm = (s) => s.trim().toLowerCase().replace(/ё/g, 'е')
const validCodes = new Set(dirs.filter((d) => !EXCL.some((p) => norm(d.name).includes(norm(p)))).map((d) => d.code))

// 1) каждый code справочника НП существует среди НЕисключённых терминалов
const usedCodes = new Set(settle.codes)
const missing = [...usedCodes].filter((c) => !validCodes.has(c))
console.log('settlement terminal codes:', usedCodes.size, '| valid (non-excluded) terminals:', validCodes.size)
console.log('codes NOT in DIRECTIONS:', missing.length, missing.slice(0, 10).join(', '))

// 2) все districtIdx в пределах массива districts
const DIST = settle.districts
console.log('districts:', JSON.stringify(DIST))
let badDist = 0, badReg = 0, badCode = 0
for (const it of settle.items) {
	if (it[2] < 0 || it[2] >= DIST.length) badDist++
	if (it[1] < 0 || it[1] >= settle.regions.length) badReg++
	if (it[3] < 0 || it[3] >= settle.codes.length) badCode++
}
console.log('bad districtIdx:', badDist, '| bad regionIdx:', badReg, '| bad codeIdx:', badCode)

// 3) ни один НП не в Калининградской области
const kld = settle.items.filter((it) => settle.regions[it[1]] === 'Калининградская область').length
console.log('Kaliningrad-oblast settlements (must be 0):', kld)

// 4) распределение surcharge: сколько НП попадает под +30%
const SUR = new Set(['south','caucasus','volga','ural','central','northwest'])
let sur = 0
for (const it of settle.items) if (SUR.has(DIST[it[2]])) sur++
console.log('settlements with +30% surcharge:', sur, '/', settle.items.length, '(' + Math.round((sur / settle.items.length) * 100) + '%)')
