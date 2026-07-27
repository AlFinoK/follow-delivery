-- Транспортные накладные в БД (ПРАВКИ 2, п.6) + атомарный счётчик номеров (п.7).
-- Идемпотентно: IF NOT EXISTS везде, счётчик инициализируется один раз.

-- CreateTable: Waybill
CREATE TABLE IF NOT EXISTS "Waybill" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "senderFullName" TEXT NOT NULL,
    "senderType" TEXT NOT NULL DEFAULT 'individual',
    "senderCompanyName" TEXT,
    "senderCompanyTin" TEXT,
    "senderContactPerson" TEXT,
    "senderAddress" TEXT NOT NULL,
    "senderCity" TEXT NOT NULL,
    "senderCountry" TEXT NOT NULL DEFAULT 'Казахстан',
    "receiverFullName" TEXT NOT NULL,
    "receiverPhone" TEXT NOT NULL,
    "receiverTin" TEXT,
    "receiverPassport" TEXT,
    "receiverAddress" TEXT NOT NULL,
    "receiverCity" TEXT NOT NULL,
    "receiverCountry" TEXT NOT NULL DEFAULT 'Россия',
    "nature" TEXT NOT NULL DEFAULT '',
    "packagingOk" BOOLEAN NOT NULL DEFAULT false,
    "specialInstructions" TEXT,
    "manualVolume" BOOLEAN NOT NULL DEFAULT false,
    "volume" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "payer" TEXT NOT NULL DEFAULT 'receiver',
    "payMethod" TEXT NOT NULL DEFAULT 'cash',
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "acceptanceDate" TIMESTAMP(3),
    "shipmentDate" TIMESTAMP(3),
    "deliveryTimeframe" TEXT,
    "cargoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Waybill_pkey" PRIMARY KEY ("id")
);

-- CreateTable: WaybillItem
CREATE TABLE IF NOT EXISTS "WaybillItem" (
    "id" TEXT NOT NULL,
    "waybillId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "length" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "width" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "height" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "WaybillItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable: WaybillCounter (одна строка 'main')
CREATE TABLE IF NOT EXISTS "WaybillCounter" (
    "id" TEXT NOT NULL,
    "value" INTEGER NOT NULL,

    CONSTRAINT "WaybillCounter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Waybill_number_key" ON "Waybill"("number");
CREATE UNIQUE INDEX IF NOT EXISTS "Waybill_cargoId_key" ON "Waybill"("cargoId");
CREATE INDEX IF NOT EXISTS "Waybill_createdAt_idx" ON "Waybill"("createdAt");
CREATE INDEX IF NOT EXISTS "Waybill_status_idx" ON "Waybill"("status");
CREATE INDEX IF NOT EXISTS "WaybillItem_waybillId_sortOrder_idx" ON "WaybillItem"("waybillId", "sortOrder");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "Waybill" ADD CONSTRAINT "Waybill_cargoId_fkey" FOREIGN KEY ("cargoId") REFERENCES "Cargo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "WaybillItem" ADD CONSTRAINT "WaybillItem_waybillId_fkey" FOREIGN KEY ("waybillId") REFERENCES "Waybill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Инициализация счётчика: следующий выданный номер = value + 1.
-- Стартуем не ниже 2999 (номера 1–2999 заняты в текущей системе) и не ниже
-- максимального уже существующего Cargo.cargoNumber, чтобы не выдать дубль.
INSERT INTO "WaybillCounter" ("id", "value")
SELECT 'main', GREATEST(2999, COALESCE((SELECT MAX("cargoNumber") FROM "Cargo"), 0))
WHERE NOT EXISTS (SELECT 1 FROM "WaybillCounter" WHERE "id" = 'main');
