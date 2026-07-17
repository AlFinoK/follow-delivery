import { beforeEach } from 'vitest'

// Демо-стор ([lib/demo/store.ts]) хранит данные в sessionStorage и проверяет typeof window.
// В node-тестах даём минимальный in-memory shim, чтобы проверять реальную логику песочницы.
class MemStorage {
	private m = new Map<string, string>()
	getItem(k: string) {
		return this.m.has(k) ? this.m.get(k)! : null
	}
	setItem(k: string, v: string) {
		this.m.set(k, String(v))
	}
	removeItem(k: string) {
		this.m.delete(k)
	}
	clear() {
		this.m.clear()
	}
	key(i: number) {
		return [...this.m.keys()][i] ?? null
	}
	get length() {
		return this.m.size
	}
}

;(globalThis as unknown as { window: unknown }).window = globalThis
;(globalThis as unknown as { sessionStorage: MemStorage }).sessionStorage = new MemStorage()

beforeEach(() => {
	;(globalThis as unknown as { sessionStorage: MemStorage }).sessionStorage.clear()
})
