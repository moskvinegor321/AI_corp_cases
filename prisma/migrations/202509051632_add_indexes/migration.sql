-- Performance indexes for frequent filters/sorts
CREATE INDEX IF NOT EXISTS "Post_pillar_status_idx" ON "Post" ("pillarId", "status");
CREATE INDEX IF NOT EXISTS "Post_status_idx" ON "Post" ("status");
CREATE INDEX IF NOT EXISTS "Post_createdAt_idx" ON "Post" ("createdAt");
CREATE INDEX IF NOT EXISTS "Post_updatedAt_idx" ON "Post" ("updatedAt");
CREATE INDEX IF NOT EXISTS "Post_scheduledAt_idx" ON "Post" ("scheduledAt");
CREATE INDEX IF NOT EXISTS "Post_publishedAt_idx" ON "Post" ("publishedAt");
CREATE INDEX IF NOT EXISTS "PostComment_post_created_idx" ON "PostComment" ("postId", "createdAt");


