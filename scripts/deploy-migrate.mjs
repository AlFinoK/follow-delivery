// Применение миграций на деплое (Vercel build), устойчивое к БД, созданной через
// `prisma db push` (таблицы есть, истории миграций нет → иначе P3005).
//
// Логика:
//   • если есть таблица Cargo, но нет _prisma_migrations → база была db-push'нута:
//     помечаем стартовую миграцию как уже применённую (baseline), не выполняя её;
//   • затем `prisma migrate deploy` накатывает остальные (CargoPreset и будущие).
// На пустой БД baseline не нужен — deploy создаёт всё с нуля. Идемпотентно.
import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { PrismaClient } from '@prisma/client'

// Локально .env.local/.env имеют приоритет (как у Next), перебивая системный DATABASE_URL.
// На Vercel этих файлов нет → используется DATABASE_URL из окружения (прод).
for (const f of ['.env.local', '.env']) {
	if (!existsSync(f)) continue
	const m = readFileSync(f, 'utf8').match(/^\s*DATABASE_URL\s*=\s*(.+)\s*$/m)
	if (m) {
		const v = m[1].trim().replace(/^["']/, '').replace(/["']$/, '')
		if (v) {
			process.env.DATABASE_URL = v
			break
		}
	}
}

const BASELINE = '20260524120000_init'
// Явно прокидываем DATABASE_URL дочерним prisma-командам (чтобы локальный .env не перебил)
const childEnv = { ...process.env }
const run = (cmd) => execSync(cmd, { stdio: 'inherit', env: childEnv })
try {
	console.log('[deploy-migrate] target DB host =', process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).host : 'UNSET')
} catch {}

let needBaseline = false
const prisma = new PrismaClient()
const tableExists = async (name) => {
	const r = await prisma.$queryRawUnsafe(
		`SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1) AS e`,
		name
	)
	return !!r?.[0]?.e
}
try {
	const cargoExists = await tableExists('Cargo')
	const historyExists = await tableExists('_prisma_migrations')
	let initApplied = false
	if (historyExists) {
		const m = await prisma.$queryRawUnsafe(
			`SELECT COUNT(*)::int AS n FROM "_prisma_migrations" WHERE migration_name = $1 AND finished_at IS NOT NULL`,
			BASELINE
		)
		initApplied = (m?.[0]?.n || 0) > 0
	}
	// БД не пустая (есть Cargo), но стартовая миграция не зафиксирована → нужен baseline
	needBaseline = cargoExists && !initApplied
} catch (e) {
	console.warn('[deploy-migrate] precheck failed (continuing):', e.message?.split('\n')[0])
} finally {
	await prisma.$disconnect()
}

if (needBaseline) {
	console.log(`[deploy-migrate] existing db-push database detected → baselining ${BASELINE}`)
	run(`npx prisma migrate resolve --applied ${BASELINE}`)
}
run('npx prisma migrate deploy')
