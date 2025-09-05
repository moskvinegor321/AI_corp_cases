-- Add searchQuery column to Post for storing per-post search used during generation/edits
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "searchQuery" text;

