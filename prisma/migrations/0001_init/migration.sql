-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."StoryStatus" AS ENUM ('triage', 'published', 'rejected');

-- CreateTable
CREATE TABLE "public"."Story" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleSlug" TEXT NOT NULL,
    "script" TEXT NOT NULL,
    "company" TEXT,
    "sources" TEXT[],
    "status" "public"."StoryStatus" NOT NULL DEFAULT 'triage',
    "noveltyNote" TEXT,
    "confidence" DOUBLE PRECISION,
    "origin" TEXT NOT NULL DEFAULT 'generated',
    "duplicateOfId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    CONSTRAINT "Story_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BanTitle" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleSlug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BanTitle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Story_titleSlug_key" ON "public"."Story"("titleSlug");

-- CreateIndex
CREATE UNIQUE INDEX "BanTitle_titleSlug_key" ON "public"."BanTitle"("titleSlug");
