-- CreateTable
CREATE TABLE "Tag" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaCollection" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "icon" TEXT,
    "description" TEXT,
    "parentId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaCollectionLink" (
    "id" SERIAL NOT NULL,
    "fromId" INTEGER NOT NULL,
    "toId" INTEGER NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaCollectionLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ImageTags" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ImageTags_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ImageCollections" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ImageCollections_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE INDEX "MediaCollection_parentId_idx" ON "MediaCollection"("parentId");

-- CreateIndex
CREATE INDEX "MediaCollectionLink_toId_idx" ON "MediaCollectionLink"("toId");

-- CreateIndex
CREATE UNIQUE INDEX "MediaCollectionLink_fromId_toId_key" ON "MediaCollectionLink"("fromId", "toId");

-- CreateIndex
CREATE INDEX "_ImageTags_B_index" ON "_ImageTags"("B");

-- CreateIndex
CREATE INDEX "_ImageCollections_B_index" ON "_ImageCollections"("B");

-- AddForeignKey
ALTER TABLE "MediaCollection" ADD CONSTRAINT "MediaCollection_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "MediaCollection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaCollectionLink" ADD CONSTRAINT "MediaCollectionLink_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "MediaCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaCollectionLink" ADD CONSTRAINT "MediaCollectionLink_toId_fkey" FOREIGN KEY ("toId") REFERENCES "MediaCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ImageTags" ADD CONSTRAINT "_ImageTags_A_fkey" FOREIGN KEY ("A") REFERENCES "Image"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ImageTags" ADD CONSTRAINT "_ImageTags_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ImageCollections" ADD CONSTRAINT "_ImageCollections_A_fkey" FOREIGN KEY ("A") REFERENCES "Image"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ImageCollections" ADD CONSTRAINT "_ImageCollections_B_fkey" FOREIGN KEY ("B") REFERENCES "MediaCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
