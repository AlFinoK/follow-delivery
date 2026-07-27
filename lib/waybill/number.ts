// Выдача номеров накладных (ПРАВКИ 2, п.7). Только сервер.
//
// Раньше номер выдавал КЛИЕНТ из счётчика в sessionStorage — два оператора,
// открывшие форму одновременно, получали один и тот же номер. Теперь номер даёт
// БД одним атомарным UPSERT ... RETURNING: параллельные запросы сериализуются на
// блокировке строки счётчика, поэтому дублей быть не может. Дополнительно номер
// защищён UNIQUE-констрейнтом Waybill.number.

import { prisma } from '@/lib/prisma'

/** Атомарно выдаёт следующий номер накладной. Первый номер — 3000 (1–2999 заняты). */
export async function reserveWaybillNumber(): Promise<number> {
	const rows = await prisma.$queryRaw<{ value: number }[]>`
		INSERT INTO "WaybillCounter" ("id", "value") VALUES ('main', 3000)
		ON CONFLICT ("id") DO UPDATE SET "value" = "WaybillCounter"."value" + 1
		RETURNING "value"`
	return Number(rows[0].value)
}
