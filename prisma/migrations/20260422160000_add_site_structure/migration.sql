CREATE TABLE IF NOT EXISTS "SiteStructureItem" (
  "id" SERIAL PRIMARY KEY,
  "titleEN" TEXT NOT NULL,
  "titleZH" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "parentId" INTEGER,
  "position" INTEGER NOT NULL DEFAULT 0,
  "pageEntityId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "SiteStructureItem_slug_key" ON "SiteStructureItem"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "SiteStructureItem_pageEntityId_key" ON "SiteStructureItem"("pageEntityId");
CREATE INDEX IF NOT EXISTS "SiteStructureItem_parentId_position_idx" ON "SiteStructureItem"("parentId", "position");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'SiteStructureItem_parentId_fkey'
      AND table_name = 'SiteStructureItem'
  ) THEN
    ALTER TABLE "SiteStructureItem"
      ADD CONSTRAINT "SiteStructureItem_parentId_fkey"
      FOREIGN KEY ("parentId") REFERENCES "SiteStructureItem"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'SiteStructureItem_pageEntityId_fkey'
      AND table_name = 'SiteStructureItem'
  ) THEN
    ALTER TABLE "SiteStructureItem"
      ADD CONSTRAINT "SiteStructureItem_pageEntityId_fkey"
      FOREIGN KEY ("pageEntityId") REFERENCES "ContentEntity"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
