// Единая точка доступа к данным для компонентов: контракт — в [types.ts],
// реализация — [httpRepo.ts] (fetch к /api/*).
//
// Раньше здесь выбиралась реализация (прод / демо-песочница на sessionStorage);
// демо-прослойка удалена, поэтому осталась одна.

import { httpRepos } from './httpRepo'
import type { Repos } from './types'

export const repos: Repos = httpRepos
