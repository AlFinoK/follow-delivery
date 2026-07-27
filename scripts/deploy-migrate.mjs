// Применение миграций на деплое (Vercel build). Задача скрипта — гарантировать, что
// после сборки схема БД соответствует коду. Либо схема на месте, либо сборка падает и
// на проде остаётся прежняя рабочая версия: варианта «сайт задеплоился, а раздел
// отдаёт 500 из-за отсутствующей таблицы» быть не должно.
//
// Порядок:
//   1) baseline, если база создавалась через `prisma db push` (таблицы есть, истории
//      миграций нет → иначе P3005);
//   2) `prisma migrate deploy` — обычный путь;
//   3) проверка, что нужные таблицы/колонки реально существуют;
//   4) если что-то не так — прогон SQL миграций напрямую (`prisma db execute`).
//      Он не берёт advisory-lock, поэтому проходит и через пулер (pgbouncer), на котором
//      спотыкается `migrate deploy`. Все миграции идемпотентны (IF NOT EXISTS), так что
//      повторный прогон безопасен;
//   5) повторная проверка. Не сошлось — exit 1 (сборка падает осознанно).
import { execSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PrismaClient } from '@prisma/client'

// Локально .env.local/.env имеют приоритет (как у Next), перебивая системный DATABASE_URL.
// На Vercel этих файлов нет → используется DATABASE_URL из окружения (прод).
// DEPLOY_MIGRATE_DB_URL — явный override поверх всего (тесты/CI на отдельной базе).
if (process.env.DEPLOY_MIGRATE_DB_URL) {
	process.env.DATABASE_URL = process.env.DEPLOY_MIGRATE_DB_URL
} else {
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
}

const BASELINE = '20260524120000_init'
const MIGRATIONS_DIR = 'prisma/migrations'

// Объекты схемы, без которых приложение отдаёт 500. Дополнять при новых миграциях.
const REQUIRED_TABLES = ['Cargo', 'Folder', 'CargoPreset', 'Waybill', 'WaybillItem', 'WaybillCounter']
const REQUIRED_COLUMNS = [
	['CargoPreset', 'goodsPrice'],
	['Waybill', 'number'],
	['Waybill', 'deliveryTimeframe'],
	['WaybillItem', 'price'],
]

// Для migrate deploy предпочитаем ПРЯМОЕ подключение (через пулер не берётся advisory-lock).
const migrateUrl = process.env.DIRECT_URL || process.env.DATABASE_URL
const migrateEnv = { ...process.env, DATABASE_URL: migrateUrl }
// Для db execute — обычный URL: он гарантированно доступен и лок ему не нужен.
const execEnv = { ...process.env }
const run = (cmd, env = migrateEnv) => execSync(cmd, { stdio: 'inherit', env })

try {
	console.log('[deploy-migrate] migrate DB host =', migrateUrl ? new URL(migrateUrl).host : 'UNSET', process.env.DIRECT_URL ? '(DIRECT_URL)' : '')
} catch {}

const prisma = new PrismaClient()
const one = async (sql, ...args) => (await prisma.$queryRawUnsafe(sql, ...args))?.[0]

const tableExists = async (name) =>
	!!(await one(`SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1) AS e`, name))?.e

const columnExists = async (table, column) =>
	!!(
		await one(
			`SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 AND column_name=$2) AS e`,
			table,
			column
		)
	)?.e

/** Имена миграций, зафиксированных в истории как применённые. */
async function appliedMigrations() {
	if (!(await tableExists('_prisma_migrations'))) return new Set()
	const rows = await prisma.$queryRawUnsafe(
		`SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`
	)
	return new Set(rows.map((r) => r.migration_name))
}

/**
 * Незавершённые миграции в истории. Из-за них `migrate deploy` отказывается работать
 * (P3009) и НИ ОДНА следующая миграция не применяется. Помечаем их откатанными: SQL
 * идемпотентен, поэтому дальше он просто прогонится заново.
 */
async function clearFailedHistory() {
	if (!(await tableExists('_prisma_migrations'))) return
	const rows = await prisma.$queryRawUnsafe(
		`SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NULL AND rolled_back_at IS NULL`
	)
	for (const { migration_name: name } of rows) {
		console.log(`[deploy-migrate] в истории застряла незавершённая ${name} → помечаю откатанной`)
		try {
			run(`npx prisma migrate resolve --rolled-back ${name}`)
		} catch (e) {
			console.warn(`[deploy-migrate] не удалось пометить ${name}:`, e.message?.split('\n')[0])
		}
	}
}

// prisma db execute падает на BOM в начале файла (у ранних миграций он есть), а править
// сам файл нельзя — Prisma сверяет контрольную сумму применённых миграций. Поэтому
// прогоняем через временную копию без BOM.
const tmpDir = mkdtempSync(join(tmpdir(), 'ltt-migrate-'))
function sanitizedSqlFile(name, file) {
	const sql = readFileSync(file, 'utf8').replace(/^﻿/, '')
	const out = join(tmpDir, `${name}.sql`)
	writeFileSync(out, sql, 'utf8')
	return out
}

/** Чего не хватает в схеме. Пустой массив = всё на месте. */
async function schemaGaps() {
	const gaps = []
	for (const t of REQUIRED_TABLES) if (!(await tableExists(t))) gaps.push(`таблица ${t}`)
	for (const [t, c] of REQUIRED_COLUMNS) {
		if (gaps.some((g) => g === `таблица ${t}`)) continue
		if (!(await columnExists(t, c))) gaps.push(`колонка ${t}.${c}`)
	}
	return gaps
}

const migrationDirs = () =>
	readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
		.filter((d) => d.isDirectory() && existsSync(join(MIGRATIONS_DIR, d.name, 'migration.sql')))
		.map((d) => d.name)
		.sort()

let failed = false
try {
	// ── 0. расчистка истории от незавершённых миграций (иначе P3009) ──────────
	await clearFailedHistory()

	// ── 1. baseline для базы, созданной через db push ────────────────────────
	const cargoExists = await tableExists('Cargo')
	const applied = await appliedMigrations()
	if (cargoExists && !applied.has(BASELINE)) {
		console.log(`[deploy-migrate] existing db-push database detected → baselining ${BASELINE}`)
		try {
			run(`npx prisma migrate resolve --applied ${BASELINE}`)
		} catch (e) {
			console.warn('[deploy-migrate] baseline не удался:', e.message?.split('\n')[0])
		}
	}

	// ── 2. обычный путь ──────────────────────────────────────────────────────
	let deployOk = true
	try {
		run('npx prisma migrate deploy')
	} catch (e) {
		deployOk = false
		console.warn('[deploy-migrate] migrate deploy не прошёл:', e.message?.split('\n')[0])
		console.warn('[deploy-migrate] перехожу на прямой прогон SQL (частые причины: БД за пулером,')
		console.warn('[deploy-migrate] BOM в файле миграции, застрявшая запись в истории)')
	}

	// ── 3. проверка схемы ────────────────────────────────────────────────────
	let gaps = await schemaGaps()

	// ── 4. фолбэк: прогоняем SQL миграций напрямую (идемпотентно, без локов) ──
	if (!deployOk || gaps.length) {
		if (gaps.length) console.warn('[deploy-migrate] в схеме не хватает:', gaps.join(', '))
		const recorded = await appliedMigrations()
		for (const name of migrationDirs()) {
			const file = sanitizedSqlFile(name, join(MIGRATIONS_DIR, name, 'migration.sql'))
			console.log(`[deploy-migrate] прямой прогон ${name}`)
			try {
				run(`npx prisma db execute --file "${file}" --schema prisma/schema.prisma`, execEnv)
				if (!recorded.has(name)) {
					try {
						run(`npx prisma migrate resolve --applied ${name}`, execEnv)
					} catch (e) {
						// история миграций не критична: схема уже верна
						console.warn(`[deploy-migrate] не удалось отметить ${name} в истории:`, e.message?.split('\n')[0])
					}
				}
			} catch (e) {
				console.error(`[deploy-migrate] ${name} не применилась:`, e.message?.split('\n')[0])
			}
		}
		// ── 5. повторная проверка ───────────────────────────────────────────
		gaps = await schemaGaps()
	}

	if (gaps.length) {
		failed = true
		console.error('\n[deploy-migrate] СХЕМА БД НЕ СООТВЕТСТВУЕТ КОДУ. Не хватает:', gaps.join(', '))
		console.error('[deploy-migrate] сборка остановлена — на проде останется предыдущая рабочая версия.')
		console.error('[deploy-migrate] что проверить: доступ пользователя БД к CREATE TABLE; если БД за пулером —')
		console.error('[deploy-migrate] задайте env DIRECT_URL (прямое подключение, порт 5432) в настройках проекта.')
	} else {
		console.log('[deploy-migrate] OK — схема БД соответствует коду')
	}
} catch (e) {
	failed = true
	console.error('[deploy-migrate] непредвиденная ошибка:', e.message?.split('\n')[0])
} finally {
	await prisma.$disconnect()
}

if (failed) process.exit(1)
