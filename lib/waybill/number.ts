// Выдача номеров накладных (ПРАВКИ 2, п.7). Только сервер.
//
// Раньше номер выдавал КЛИЕНТ из счётчика в sessionStorage — два оператора,
// открывшие форму одновременно, получали один и тот же номер. Теперь номер даёт
// БД одним атомарным UPSERT ... RETURNING: параллельные запросы сериализуются на
// блокировке строки счётчика, поэтому дублей быть не может. Дополнительно номер
// защищён UNIQUE-констрейнтом Waybill.number.
//
// ⚠️ Счётчик сам по себе не знает о номерах, которые ввели РУКАМИ: в /admin у груза
// можно набрать любой cargoNumber, а накладная кладёт свой номер в Cargo.cargoNumber.
// Раньше счётчик подтягивался к MAX(Cargo.cargoNumber) один раз (миграцией), и вручную
// заведённый груз №3105 позже сталкивался с выданным накладной номером 3105. Поэтому
// КАЖДАЯ выдача считает value = GREATEST(счётчик, MAX(cargoNumber), MAX(Waybill.number)) + 1
// в том же атомарном выражении. Стартовое значение — тоже с учётом уже существующих
// накладных и грузов, а не безусловные 3000.

import { prisma } from '@/lib/prisma'

/** Первый номер — 3000 (1–2999 заняты), поэтому «нулём» считаем 2999. */
const FLOOR = 2999

/**
 * Номера (груза и накладной) выше этого порога не учитываем: так прибавление единицы не выйдет за int32
 * (и случайно набранный «999999999999» не утащит счётчик в космос).
 */
const CARGO_NUMBER_CEIL = 1_000_000_000

/** Атомарно выдаёт следующий номер накладной. Первый номер — 3000 (1–2999 заняты). */
export async function reserveWaybillNumber(): Promise<number> {
	const rows = await prisma.$queryRaw<{ value: number }[]>`
		INSERT INTO "WaybillCounter" ("id", "value")
		VALUES (
			'main',
			GREATEST(
				${FLOOR}::int,
				COALESCE((SELECT MAX("cargoNumber") FROM "Cargo" WHERE "cargoNumber" < ${CARGO_NUMBER_CEIL}::int), ${FLOOR}::int),
				COALESCE((SELECT MAX("number") FROM "Waybill" WHERE "number" < ${CARGO_NUMBER_CEIL}::int), ${FLOOR}::int)
			) + 1
		)
		ON CONFLICT ("id") DO UPDATE SET "value" = GREATEST(
			"WaybillCounter"."value",
			COALESCE((SELECT MAX("cargoNumber") FROM "Cargo" WHERE "cargoNumber" < ${CARGO_NUMBER_CEIL}::int), ${FLOOR}::int),
			COALESCE((SELECT MAX("number") FROM "Waybill" WHERE "number" < ${CARGO_NUMBER_CEIL}::int), ${FLOOR}::int)
		) + 1
		RETURNING "value"`
	return Number(rows[0].value)
}
