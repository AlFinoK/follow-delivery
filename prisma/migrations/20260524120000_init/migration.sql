-- Идемпотентная стартовая миграция (baseline). Безопасна на БД, созданной через
-- `prisma db push` (таблицы уже есть): IF NOT EXISTS пропускает существующие объекты.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE IF NOT EXISTS "Cargo" (
    "id" TEXT NOT NULL,
    "trackingId" TEXT NOT NULL,
    "cargoNumber" INTEGER,
    "name" TEXT,
    "fromCity" TEXT NOT NULL,
    "currentCity" TEXT NOT NULL,
    "toCity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ожидает отправления',
    "acceptanceDate" TIMESTAMP(3),
    "shipmentDate" TIMESTAMP(3),
    "deliveryTimeframe" TEXT,
    "deliveryAmount" DOUBLE PRECISION,
    "paymentStatus" TEXT NOT NULL DEFAULT 'none',
    "partialPaymentDetail" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'KZT',
    "folderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cargo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Folder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Folder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Cargo_trackingId_key" ON "Cargo"("trackingId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Cargo_folderId_idx" ON "Cargo"("folderId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Cargo_cargoNumber_idx" ON "Cargo"("cargoNumber");

-- AddForeignKey (идемпотентно: PostgreSQL не поддерживает ADD CONSTRAINT IF NOT EXISTS)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Cargo_folderId_fkey') THEN
        ALTER TABLE "Cargo" ADD CONSTRAINT "Cargo_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

