'use client'

// Единая точка доступа к данным для клиентских компонентов. Внутри /demo возвращает
// демо-реализацию (sessionStorage, без реальных данных), вне — реальную (fetch /api/*).

import { useDemo } from '@/contexts/DemoContext'
import { httpRepos } from './httpRepo'
import { demoRepos } from './demoRepo'
import type { Repos } from './types'

export function useRepos(): Repos {
	return useDemo().isDemo ? demoRepos : httpRepos
}
