ALTER TABLE "User"
    ADD COLUMN "feishuOpenId" TEXT;

CREATE UNIQUE INDEX "User_feishuOpenId_key" ON "User" ("feishuOpenId");

CREATE TABLE "FeishuMessage"
(
    "id"          TEXT         NOT NULL,
    "type"        TEXT         NOT NULL,
    "recipient"   TEXT         NOT NULL,
    "recipientId" TEXT         NOT NULL,
    "content"     TEXT         NOT NULL,
    "status"      TEXT         NOT NULL DEFAULT 'pending',
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt"      TIMESTAMP(3),
    "error"       TEXT,
    CONSTRAINT "FeishuMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FeishuMessage_createdAt_idx" ON "FeishuMessage" ("createdAt" DESC);
