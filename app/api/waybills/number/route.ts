import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { reserveWaybillNumber } from '@/lib/waybill/number'

// POST /api/waybills/number — зарезервировать номер накладной (auth).
// Номер выдаёт БД атомарно, см. [lib/waybill/number.ts] (ПРАВКИ 2, п.7).
export async function POST() {
	const denied = await requireAuth()
	if (denied) return denied

	const number = await reserveWaybillNumber()
	return NextResponse.json({ number })
}
