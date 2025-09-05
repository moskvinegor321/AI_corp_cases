-- Add new enum value REJECTED to PostStatus
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'PostStatus' AND e.enumlabel = 'REJECTED'
  ) THEN
    ALTER TYPE "PostStatus" ADD VALUE 'REJECTED';
  END IF;
END$$;


