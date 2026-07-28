// Ключи перевода для статусов накладной. В UI статус показываем через t(),
// а STATUS_LABELS из model.ts остаётся для печатной формы: PDF всегда русский.
import type { TranslationKey } from '@/lib/i18n'
import type { WaybillStatus } from './model'

export const STATUS_KEYS: Record<WaybillStatus, TranslationKey> = {
	draft: 'wsDraft',
	active: 'wsActive',
	delivered: 'wsDelivered',
	cancelled: 'wsCancelled',
}

export const STATUS_ORDER: WaybillStatus[] = ['draft', 'active', 'delivered', 'cancelled']
