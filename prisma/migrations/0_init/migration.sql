-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'editor', 'writer');

-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('student', 'teacher');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female', 'others');

-- CreateEnum
CREATE TYPE "UserAuditLogType" AS ENUM ('login', 'autoCreatePost', 'writerCreateEntity', 'writerEditEntity', 'editorApproveEntity', 'adminApproveEntity', 'adminPublishEntity', 'unpublishEntity', 'deleteEntity', 'uploadImage', 'deleteImage');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('post', 'page', 'club', 'activity', 'project', 'course', 'faculty');

-- CreateEnum
CREATE TYPE "ContentLanguage" AS ENUM ('en', 'zh');

-- CreateEnum
CREATE TYPE "CommentAnchorType" AS ENUM ('text', 'component');

-- CreateTable
CREATE TABLE "User"
(
    "id"           INTEGER      NOT NULL,
    "name"         TEXT         NOT NULL,
    "pinyin"       TEXT         NOT NULL,
    "phone"        TEXT,
    "roles"        "Role"[],
    "type"         "UserType"   NOT NULL,
    "gender"       "Gender"     NOT NULL,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,
    "feishuOpenId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "McpOperationReceipt"
(
    "id"             TEXT         NOT NULL,
    "userId"         INTEGER      NOT NULL,
    "operation"      TEXT         NOT NULL,
    "idempotencyKey" TEXT         NOT NULL,
    "requestHash"    TEXT         NOT NULL,
    "result"         JSONB        NOT NULL,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "McpOperationReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalToken"
(
    "id"         TEXT         NOT NULL,
    "userId"     INTEGER      NOT NULL,
    "name"       TEXT         NOT NULL,
    "tokenHash"  TEXT         NOT NULL,
    "prefix"     TEXT         NOT NULL,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt"  TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt"  TIMESTAMP(3),

    CONSTRAINT "PersonalToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAuditLog"
(
    "id"     SERIAL             NOT NULL,
    "time"   TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type"   "UserAuditLogType" NOT NULL,
    "userId" INTEGER,
    "values" TEXT[],

    CONSTRAINT "UserAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentEntity"
(
    "collaborationGeneration"    INTEGER      NOT NULL DEFAULT 0,
    "id"                         SERIAL       NOT NULL,
    "type"                       "EntityType" NOT NULL,
    "linkOnly"                   BOOLEAN      NOT NULL DEFAULT false,
    "titlePublishedEN"           TEXT,
    "titlePublishedZH"           TEXT,
    "titleDraftEN"               TEXT         NOT NULL,
    "titleDraftZH"               TEXT         NOT NULL,
    "slug"                       TEXT         NOT NULL,
    "categoryEN"                 TEXT,
    "categoryZH"                 TEXT,
    "shortContentPublishedEN"    TEXT,
    "shortContentPublishedZH"    TEXT,
    "shortContentDraftEN"        TEXT,
    "shortContentDraftZH"        TEXT,
    "contentPublishedEN"         TEXT,
    "contentPublishedZH"         TEXT,
    "contentDraftEN"             TEXT         NOT NULL,
    "contentDraftZH"             TEXT         NOT NULL,
    "coverImagePublishedId"      INTEGER,
    "coverImageDraftId"          INTEGER,
    "transparentNavbarPublished" BOOLEAN,
    "transparentNavbarDraft"     BOOLEAN      NOT NULL DEFAULT false,
    "creatorId"                  INTEGER      NOT NULL,
    "createdAt"                  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"                  TIMESTAMP(3) NOT NULL,
    "lastPublishedAt"            TIMESTAMP(3) NOT NULL DEFAULT '1970-01-01 00:00:00 +00:00',

    CONSTRAINT "ContentEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YjsDocument"
(
    "name"      TEXT              NOT NULL,
    "entityId"  INTEGER           NOT NULL,
    "language"  "ContentLanguage" NOT NULL,
    "state"     BYTEA             NOT NULL,
    "createdAt" TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3)      NOT NULL,

    CONSTRAINT "YjsDocument_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "CommentThread"
(
    "id"           TEXT                NOT NULL,
    "entityId"     INTEGER             NOT NULL,
    "language"     "ContentLanguage"   NOT NULL,
    "anchorType"   "CommentAnchorType" NOT NULL,
    "componentId"  TEXT,
    "anchorData"   JSONB,
    "quotedText"   TEXT,
    "createdById"  INTEGER             NOT NULL,
    "resolvedById" INTEGER,
    "resolvedAt"   TIMESTAMP(3),
    "createdAt"    TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3)        NOT NULL,

    CONSTRAINT "CommentThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment"
(
    "id"        TEXT         NOT NULL,
    "threadId"  TEXT         NOT NULL,
    "authorId"  INTEGER      NOT NULL,
    "parentId"  TEXT,
    "body"      TEXT         NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Image"
(
    "id"         SERIAL           NOT NULL,
    "sha1"       TEXT             NOT NULL,
    "name"       TEXT             NOT NULL,
    "altText"    TEXT             NOT NULL,
    "mediaType"  TEXT             NOT NULL DEFAULT 'image',
    "extension"  TEXT             NOT NULL DEFAULT 'webp',
    "mimeType"   TEXT             NOT NULL DEFAULT 'image/webp',
    "width"      INTEGER          NOT NULL,
    "height"     INTEGER          NOT NULL,
    "sizeKB"     INTEGER          NOT NULL,
    "focusX"     DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "focusY"     DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "focusSize"  DOUBLE PRECISION NOT NULL DEFAULT 1,
    "uploaderId" INTEGER,
    "createdAt"  TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Approval"
(
    "id"         SERIAL       NOT NULL,
    "entityType" "EntityType" NOT NULL,
    "entityId"   INTEGER      NOT NULL,
    "role"       "Role"       NOT NULL,
    "userId"     INTEGER      NOT NULL,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalConfig"
(
    "id"         SERIAL       NOT NULL,
    "entityType" "EntityType" NOT NULL,
    "minEditor"  INTEGER      NOT NULL DEFAULT 1,
    "minAdmin"   INTEGER      NOT NULL DEFAULT 1,

    CONSTRAINT "ApprovalConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntityLock"
(
    "id"         SERIAL       NOT NULL,
    "entityType" "EntityType" NOT NULL,
    "entityId"   INTEGER      NOT NULL,
    "lockedBy"   INTEGER      NOT NULL,
    "lockedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "token"      TEXT         NOT NULL,

    CONSTRAINT "EntityLock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateIndex
CREATE UNIQUE INDEX "User_feishuOpenId_key" ON "User" ("feishuOpenId");

-- CreateIndex
CREATE UNIQUE INDEX "McpOperationReceipt_userId_operation_idempotencyKey_key" ON "McpOperationReceipt" ("userId", "operation", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "PersonalToken_tokenHash_key" ON "PersonalToken" ("tokenHash");

-- CreateIndex
CREATE INDEX "PersonalToken_userId_createdAt_idx" ON "PersonalToken" ("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ContentEntity_slug_key" ON "ContentEntity" ("slug");

-- CreateIndex
CREATE INDEX "YjsDocument_updatedAt_idx" ON "YjsDocument" ("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "YjsDocument_entityId_language_key" ON "YjsDocument" ("entityId", "language");

-- CreateIndex
CREATE INDEX "CommentThread_entityId_language_resolvedAt_idx" ON "CommentThread" ("entityId", "language", "resolvedAt");

-- CreateIndex
CREATE INDEX "CommentThread_entityId_language_componentId_idx" ON "CommentThread" ("entityId", "language", "componentId");

-- CreateIndex
CREATE INDEX "Comment_threadId_createdAt_idx" ON "Comment" ("threadId", "createdAt");

-- CreateIndex
CREATE INDEX "Comment_parentId_idx" ON "Comment" ("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "Image_sha1_key" ON "Image" ("sha1");

-- CreateIndex
CREATE INDEX "Approval_entityType_entityId_idx" ON "Approval" ("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "Approval_entityType_entityId_role_userId_key" ON "Approval" ("entityType", "entityId", "role", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalConfig_entityType_key" ON "ApprovalConfig" ("entityType");

-- CreateIndex
CREATE INDEX "EntityLock_lockedBy_idx" ON "EntityLock" ("lockedBy");

-- CreateIndex
CREATE UNIQUE INDEX "EntityLock_entityType_entityId_key" ON "EntityLock" ("entityType", "entityId");

-- CreateIndex
CREATE INDEX "FeishuMessage_createdAt_idx" ON "FeishuMessage" ("createdAt" DESC);

-- AddForeignKey
ALTER TABLE "McpOperationReceipt"
    ADD CONSTRAINT "McpOperationReceipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalToken"
    ADD CONSTRAINT "PersonalToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAuditLog"
    ADD CONSTRAINT "UserAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentEntity"
    ADD CONSTRAINT "ContentEntity_coverImagePublishedId_fkey" FOREIGN KEY ("coverImagePublishedId") REFERENCES "Image" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentEntity"
    ADD CONSTRAINT "ContentEntity_coverImageDraftId_fkey" FOREIGN KEY ("coverImageDraftId") REFERENCES "Image" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentEntity"
    ADD CONSTRAINT "ContentEntity_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YjsDocument"
    ADD CONSTRAINT "YjsDocument_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "ContentEntity" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentThread"
    ADD CONSTRAINT "CommentThread_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "ContentEntity" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentThread"
    ADD CONSTRAINT "CommentThread_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentThread"
    ADD CONSTRAINT "CommentThread_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment"
    ADD CONSTRAINT "Comment_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "CommentThread" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment"
    ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment"
    ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image"
    ADD CONSTRAINT "Image_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityLock"
    ADD CONSTRAINT "EntityLock_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "ContentEntity" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
