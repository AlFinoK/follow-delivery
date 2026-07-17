// Тест-гард изоляции демо-песочницы. Падает (exit 1), если демо-слой может
// коснуться РЕАЛЬНЫХ данных прода. Запуск: node scripts/check-demo-isolation.mjs
// (или npm run test:isolation). Не требует зависимостей.
//
// Инварианты:
//  1) Демо-песочница (lib/demo, lib/data/demoRepo.ts, app/demo, components/demo)
//     НЕ обращается к реальным данным клиентов: ни /api/cargos, ни /api/folders,
//     ни Prisma (@prisma/client / lib/prisma).
//  2) Демо-маршруты и demoRepo не импортируют реальный httpRepo напрямую.
//  3) Общие вынесенные страницы (components/pages) не делают прямых fetch к
//     customer-эндпоинтам — только через слой репозиториев (useRepos).
//  4) Схема Prisma и API-роуты не менялись этим изменением (git-проверка, если доступна).

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'
import { execSync } from 'node:child_process'

const ROOT = process.cwd()
const violations = []
const fail = (file, msg) => violations.push(`${relative(ROOT, file)} — ${msg}`)

function walk(path, exts = ['.ts', '.tsx']) {
	const out = []
	if (!existsSync(path)) return out
	const st = statSync(path)
	if (st.isFile()) return exts.some((e) => path.endsWith(e)) ? [path] : []
	for (const name of readdirSync(path)) out.push(...walk(join(path, name), exts))
	return out
}

const read = (f) => readFileSync(f, 'utf8')

// ── 1) Песочница не касается реальных данных ────────────────────────────────
const SANDBOX = [
	join(ROOT, 'lib/demo'),
	join(ROOT, 'lib/data/demoRepo.ts'),
	join(ROOT, 'app/demo'),
	join(ROOT, 'components/demo'),
]
const FORBIDDEN_IN_SANDBOX = [
	{ re: /\/api\/cargos/, msg: 'ссылается на реальный эндпоинт /api/cargos (данные клиентов)' },
	{ re: /\/api\/folders/, msg: 'ссылается на реальный эндпоинт /api/folders (данные клиентов)' },
	{ re: /@prisma\/client/, msg: 'импортирует @prisma/client (прямой доступ к БД)' },
	{ re: /['"]@\/lib\/prisma['"]|lib\/prisma/, msg: 'импортирует lib/prisma (прямой доступ к БД)' },
	{ re: /\bfrom ['"]next-auth/, msg: 'импортирует next-auth (серверная авторизация в песочнице)' },
]
for (const base of SANDBOX) {
	for (const f of walk(base)) {
		const src = read(f)
		for (const { re, msg } of FORBIDDEN_IN_SANDBOX) if (re.test(src)) fail(f, msg)
	}
}

// ── 2) Демо не импортирует реальный httpRepo ────────────────────────────────
for (const f of [...walk(join(ROOT, 'app/demo')), join(ROOT, 'lib/data/demoRepo.ts')]) {
	if (existsSync(f) && /httpRepo/.test(read(f))) fail(f, 'импортирует httpRepo (реальный бэкенд) — демо должно ходить только через useRepos → demoRepo')
}

// ── 3) Общие страницы не делают прямых fetch к customer-эндпоинтам ───────────
for (const f of walk(join(ROOT, 'components/pages'))) {
	const src = read(f)
	if (/fetch\([^)]*\/api\/(cargos|folders)/.test(src)) {
		fail(f, 'прямой fetch к /api/cargos|folders — должен идти через useRepos()')
	}
}

// ── 4) Схема Prisma и API-роуты не изменены (git, best-effort) ───────────────
try {
	const changed = execSync('git status --porcelain prisma app/api', { cwd: ROOT, encoding: 'utf8' }).trim()
	if (changed) {
		for (const line of changed.split('\n')) violations.push(`prisma/app-api ИЗМЕНЁН этим коммитом: ${line.trim()} (демо не должно трогать реальный бэкенд/схему)`)
	}
} catch {
	console.warn('  (git недоступен — пропускаю проверку неизменности prisma/app-api)')
}

// ── Итог ────────────────────────────────────────────────────────────────────
if (violations.length) {
	console.error('\n❌ Нарушения изоляции демо (реальные данные под угрозой):\n')
	for (const v of violations) console.error('  • ' + v)
	console.error(`\n${violations.length} нарушение(й). Демо ДОЛЖНО оставаться client-side песочницей на sessionStorage.\n`)
	process.exit(1)
}

console.log('✅ Изоляция демо в порядке: песочница не касается /api/cargos, /api/folders, Prisma; API-роуты и схема не изменены.')
