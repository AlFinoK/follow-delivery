-- Журнал уведомлений клиенту (WhatsApp через Wazzup + SMS-фолбэк).
-- Нужен для работы автофолбэка: «у номера нет WhatsApp» приходит асинхронным вебхуком,
-- и по providerId вебхук находит, кому досылать SMS. FK на Waybill нет намеренно —
-- журнал переживает удаление накладной.
CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL,
    "waybillId" TEXT,
    "waybillNumber" INTEGER,
    "phone" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "providerId" TEXT,
    "error" TEXT,
    "fallbackOf" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Notification_providerId_idx" ON "Notification"("providerId");
CREATE INDEX IF NOT EXISTS "Notification_waybillId_idx" ON "Notification"("waybillId");
CREATE INDEX IF NOT EXISTS "Notification_createdAt_idx" ON "Notification"("createdAt");
