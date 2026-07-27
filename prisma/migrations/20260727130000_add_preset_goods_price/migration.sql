-- ПРАВКИ 2, п.1: себестоимость товара за единицу в шаблоне техники.
-- Значения заполняет менеджер в /admin/presets (по умолчанию 0 — «не указана»).
ALTER TABLE "CargoPreset" ADD COLUMN IF NOT EXISTS "goodsPrice" DOUBLE PRECISION NOT NULL DEFAULT 0;
