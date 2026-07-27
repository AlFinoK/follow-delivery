import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// Алиас '@' → корень проекта (как в tsconfig), окружение node.
const root = fileURLToPath(new URL('.', import.meta.url)).replace(/[\\/]$/, '')

export default defineConfig({
	resolve: {
		alias: [{ find: /^@\//, replacement: root + '/' }],
	},
	test: {
		environment: 'node',
		include: ['test/**/*.test.ts'],
	},
})
