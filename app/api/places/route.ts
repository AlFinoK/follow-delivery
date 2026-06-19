import { NextRequest, NextResponse } from 'next/server'
import settlements from '@/lib/calculator/settlements.json'
import { resolveSurcharge } from '@/lib/calculator/districts'

// Справочник населённых пунктов РФ (GeoNames, собран scripts/build-settlements.mjs).
// items: [name, regionIdx, districtIdx, codeIdx, population]
type Item = [string, number, number, number, number]
const data = settlements as unknown as {
	regions: string[]
	codes: string[]
	districts: string[]
	items: Item[]
}

const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е').trim()

// предрасчёт нормализованных названий один раз на инстанс
const normNames = data.items.map((it) => norm(it[0]))

const LIMIT = 25

// GET /api/places?q=... — поиск населённого пункта (публично).
//   Возвращает [{ name, region, district, code }] — code = ближайший город-терминал
//   (для тарифа), district = федеральный округ НП (для надбавки +30%).
export async function GET(req: NextRequest) {
	const q = norm(req.nextUrl.searchParams.get('q') || '')
	if (q.length < 2) return NextResponse.json([])

	const prefix: number[] = []
	const contains: number[] = []
	for (let i = 0; i < normNames.length; i++) {
		const n = normNames[i]
		if (n.startsWith(q)) prefix.push(i)
		else if (n.includes(q)) contains.push(i)
	}
	// items уже отсортированы по населению убыв. → внутри групп самые крупные раньше
	const chosen = prefix.concat(contains).slice(0, LIMIT)

	const out = chosen.map((i) => {
		const [name, ri, di, ci] = data.items[i]
		const region = data.regions[ri]
		return {
			name,
			region,
			district: data.districts[di],
			code: data.codes[ci],
			surcharge: resolveSurcharge(name, region), // доля надбавки по области НП
		}
	})
	return NextResponse.json(out)
}
