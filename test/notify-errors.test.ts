import { describe, expect, it } from 'vitest'
import { notifyErrorKey, notifyErrorText, splitJournalError } from '@/components/waybill/notifyErrors'

describe('notifyErrorKey', () => {
	it('известные коды → ключи', () => {
		expect(notifyErrorKey('BAD_CONTACT')).toBe('neBadContact')
		expect(notifyErrorKey('RECENTLY_SENT')).toBe('neRecentlySent')
		expect(notifyErrorKey('DELIVERY_FAILED')).toBe('neDeliveryFailed')
		expect(notifyErrorKey('NOT_CONFIGURED')).toBe('neNotConfigured')
		expect(notifyErrorKey('CHECK_FAILED')).toBe('neCheckFailed')
		expect(notifyErrorKey('TIMEOUT')).toBe('neTimeout')
	})

	it('HTTP_xxx → общая ошибка сервиса', () => {
		expect(notifyErrorKey('HTTP_502')).toBe('neProvider')
	})

	it('неизвестный и пустой код → null', () => {
		expect(notifyErrorKey('WEIRD')).toBeNull()
		expect(notifyErrorKey(undefined)).toBeNull()
		expect(notifyErrorKey('')).toBeNull()
	})
})

describe('splitJournalError', () => {
	it('«КОД: сообщение»', () => {
		expect(splitJournalError('BAD_CONTACT: У номера нет WhatsApp')).toEqual({ code: 'BAD_CONTACT', message: 'У номера нет WhatsApp' })
	})

	it('только код', () => {
		expect(splitJournalError('DELIVERY_FAILED')).toEqual({ message: 'DELIVERY_FAILED' })
	})

	it('без кода — всё сообщение (в т.ч. с двоеточием)', () => {
		expect(splitJournalError('Сервис ответил: ошибка')).toEqual({ message: 'Сервис ответил: ошибка' })
	})

	it('пусто', () => {
		expect(splitJournalError(null)).toEqual({})
	})
})

describe('notifyErrorText', () => {
	const t = (k: string) => `T(${k})`
	it('известный код переводится, сырой текст не показывается', () => {
		expect(notifyErrorText(t as never, 'BAD_CONTACT', 'сырой', 'fb')).toBe('T(neBadContact)')
	})
	it('неизвестный код — сырой текст, затем fallback', () => {
		expect(notifyErrorText(t as never, 'X', 'сырой', 'fb')).toBe('сырой')
		expect(notifyErrorText(t as never, 'X', '', 'fb')).toBe('fb')
	})
})
