-- Add sources column to Post as text[]
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "sources" text[] DEFAULT '{}'::text[];

