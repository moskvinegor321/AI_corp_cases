-- Add sourcePublishedAt to Post to store earliest source date
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "sourcePublishedAt" timestamp;
CREATE INDEX IF NOT EXISTS "Post_sourcePublishedAt_idx" ON "Post" ("sourcePublishedAt");

