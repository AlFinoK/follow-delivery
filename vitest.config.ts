import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// Алиас '@' → корень проекта (как в tsconfig), окружение node + шим sessionStorage.
const root = fileURLToPath(new URL('.', import.meta.url)).replace(/[\\/]$/, '')

export default defineConfig({
	resolve: {
		alias: [{ find: /^@\//, replacement: root + '/' }],
	},
	test: {
		environment: 'node',
		setupFiles: ['./test/setup.ts'],
		include: ['test/**/*.test.ts'],
	},
})
