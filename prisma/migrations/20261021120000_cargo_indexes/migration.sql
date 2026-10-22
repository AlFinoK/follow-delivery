-- Индексы под список грузов: сортировка по createdAt и группировка/фильтр по status.
-- Идемпотентно (IF NOT EXISTS) — как и остальные миграции проекта.
CREATE INDEX IF NOT EXISTS "Cargo_createdAt_idx" ON "Cargo"("createdAt");

CREATE INDEX IF NOT EXISTS "Cargo_status_idx" ON "Cargo"("status");
