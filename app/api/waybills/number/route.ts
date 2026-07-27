import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { reserveWaybillNumber } from '@/lib/waybill/number'

// POST /api/waybills/number — зарезервировать номер накладной (auth).
// Номер выдаёт БД атомарно, см. [lib/waybill/number.ts] (ПРАВКИ 2, п.7).
export async function POST() {
	const session = await getServerSession()
	if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

	const number = await reserveWaybillNumber()
	return NextResponse.json({ number })
}
