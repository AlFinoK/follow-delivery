-- Добавление таблицы пресетов техники + сид 16 стандартных пресетов из ТЗ.
-- Идемпотентно: IF NOT EXISTS + сид только если таблица пуста (цены оценочные, админ правит).

-- CreateTable
CREATE TABLE IF NOT EXISTS "CargoPreset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "length" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "basePrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CargoPreset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CargoPreset_active_sortOrder_idx" ON "CargoPreset"("active", "sortOrder");

-- Seed: 16 стандартных пресетов из ТЗ (только если таблица пуста)
INSERT INTO "CargoPreset" ("id", "name", "category", "length", "width", "height", "weight", "basePrice", "sortOrder", "active", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, v.name, v.category, v.length, v.width, v.height, v.weight, v.base, v.sort, true, now(), now()
FROM (VALUES
    ('Электровелосипед SK8', 'Электро', 130, 35, 60, 35, 23700, 1),
    ('Мопед', 'Мото', 180, 45, 80, 160, 50000, 2),
    ('Мотоцикл', 'Мото', 180, 45, 80, 150, 50000, 3),
    ('Питбайк', 'Мото', 129, 45, 62, 95, 31200, 4),
    ('Трицикл маленький', 'Трицикл', 120, 64, 64, 60, 38000, 5),
    ('Трицикл средний', 'Трицикл', 140, 70, 70, 70, 53000, 6),
    ('Трицикл большой', 'Трицикл', 170, 75, 80, 80, 75000, 7),
    ('Квадроцикл 200 куб. см', 'Квадроцикл', 190, 90, 90, 260, 110000, 8),
    ('Квадроцикл 300 куб. см', 'Квадроцикл', 200, 90, 90, 280, 115400, 9),
    ('Квадроцикл 350 куб. см', 'Квадроцикл', 205, 100, 90, 300, 130600, 10),
    ('Квадроцикл 400 куб. см', 'Квадроцикл', 210, 110, 90, 350, 146400, 11),
    ('Квадроцикл 500 куб. см', 'Квадроцикл', 215, 110, 100, 450, 166000, 12),
    ('Квадроцикл 600 куб. см', 'Квадроцикл', 220, 115, 100, 480, 177200, 13),
    ('Квадроцикл 650 куб. см', 'Квадроцикл', 220, 115, 100, 480, 177200, 14),
    ('Квадроцикл 700 куб. см', 'Квадроцикл', 220, 120, 100, 500, 184700, 15),
    ('Квадроцикл 1000 куб. см', 'Квадроцикл', 235, 140, 140, 600, 319700, 16)
) AS v(name, category, length, width, height, weight, base, sort)
WHERE NOT EXISTS (SELECT 1 FROM "CargoPreset");
