// «Одна накладная = один груз в списке» (ПРАВКИ 2, п.6): при сохранении накладной
// создаём/обновляем связанный Cargo, чтобы груз сразу был в /admin и в трекинге.
// Только для серверных роутов — использует prisma.

import { prisma } from '@/lib/prisma'
import type { waybillData } from '@/lib/mapWaybill'

type Data = ReturnType<typeof waybillData>

const WAITING = 'ожидает отправления'
const ARRIVED = 'прибыл'

/**
 * Синхронизирует Cargo с накладной и возвращает его id.
 *
 * Статусы двух сущностей — разные оси (документ vs физическое перемещение),
 * поэтому переносим только однозначное: «Доставлена» → «прибыл». Остальные
 * статусы груза (в пути / текущий город) ведёт логист в /admin, и накладная их
 * НЕ перезатирает — иначе каждое сохранение откатывало бы позицию груза назад.
 */
export async function syncCargo(number: number, data: Data, existingCargoId: string | null): Promise<string> {
	const name = data.nature || null
	const trackingId = `CARGO-${number}`

	const shared = {
		cargoNumber: number,
		name,
		fromCity: data.senderCity,
		toCity: data.receiverCity,
		acceptanceDate: data.acceptanceDate,
		shipmentDate: data.shipmentDate,
		deliveryTimeframe: data.deliveryTimeframe,
		deliveryAmount: data.amount || null,
		currency: 'KZT',
	}

	if (existingCargoId) {
		const found = await prisma.cargo.findUnique({ where: { id: existingCargoId }, select: { id: true } })
		if (found) {
			const cargo = await prisma.cargo.update({
				where: { id: existingCargoId },
				data: data.status === 'delivered' ? { ...shared, status: ARRIVED } : shared,
			})
			return cargo.id
		}
	}

	// Груза ещё нет (или его удалили из трекера) — создаём по trackingId.
	const cargo = await prisma.cargo.upsert({
		where: { trackingId },
		update: data.status === 'delivered' ? { ...shared, status: ARRIVED } : shared,
		create: {
			trackingId,
			...shared,
			currentCity: data.senderCity,
			status: data.status === 'delivered' ? ARRIVED : WAITING,
		},
	})
	return cargo.id
}
