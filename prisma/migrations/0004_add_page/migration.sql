-- CreateTable Page
CREATE TABLE IF NOT EXISTS "public"."Page" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "prompt" TEXT,
  "searchQuery" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- AlterTable Story: add pageId
ALTER TABLE "public"."Story" ADD COLUMN IF NOT EXISTS "pageId" TEXT;

-- Add FK
ALTER TABLE "public"."Story"
  ADD CONSTRAINT "Story_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "public"."Page"("id") ON DELETE SET NULL ON UPDATE CASCADE;

