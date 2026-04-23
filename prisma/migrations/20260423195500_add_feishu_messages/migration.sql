CREATE TABLE IF NOT EXISTS "FeishuMessage" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "recipient" TEXT NOT NULL,
  "recipientId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMP(3),
  "error" TEXT,
  CONSTRAINT "FeishuMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "FeishuMessage_createdAt_idx" ON "FeishuMessage"("createdAt" DESC);
