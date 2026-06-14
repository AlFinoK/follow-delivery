// GET /api/rate — актуальный курс ₽ → ₸.
// Источник: Нацбанк РК (официальный), запасной — open.er-api.com, иначе константа из конфига.
import { NextResponse } from 'next/server'
import { RUB_TO_KZT } from '@/lib/calculator/config'

const CACHE_SECONDS = 3600 // обновляем не чаще раза в час

// Нацбанк РК: XML со всеми курсами (<title>RUB</title> + <description>значение</description>)
async function fromNBK(): Promise<number | null> {
	try {
		const res = await fetch('https://nationalbank.kz/rss/rates_all.xml', {
			headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/xml,text/xml' },
			next: { revalidate: CACHE_SECONDS },
		})
		if (!res.ok) return null
		const xml = await res.text()
		for (const block of xml.split('<item>')) {
			if (!/<title>\s*RUB\s*<\/title>/i.test(block)) continue
			const val = block.match(/<description>\s*([\d.,]+)\s*<\/description>/i)
			const quant = block.match(/<quant>\s*(\d+)\s*<\/quant>/i)
			if (!val) return null
			const rate = parseFloat(val[1].replace(',', '.')) / (quant ? parseInt(quant[1], 10) : 1)
			return Number.isFinite(rate) && rate > 0 ? rate : null
		}
		return null
	} catch {
		return null
	}
}

// Запасной источник: открытый FX API
async function fromErApi(): Promise<number | null> {
	try {
		const res = await fetch('https://open.er-api.com/v6/latest/RUB', { next: { revalidate: CACHE_SECONDS } })
		if (!res.ok) return null
		const data = await res.json()
		const rate = data?.rates?.KZT
		return typeof rate === 'number' && rate > 0 ? rate : null
	} catch {
		return null
	}
}

export async function GET() {
	const nbk = await fromNBK()
	if (nbk) return NextResponse.json({ rate: Math.round(nbk * 100) / 100, source: 'nbk' })

	const er = await fromErApi()
	if (er) return NextResponse.json({ rate: Math.round(er * 100) / 100, source: 'er-api' })

	return NextResponse.json({ rate: RUB_TO_KZT, source: 'fallback' })
}
