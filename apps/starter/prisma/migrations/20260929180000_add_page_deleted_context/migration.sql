ALTER TABLE "pages"
ADD COLUMN "deleted_context" JSONB NOT NULL DEFAULT '{}'::jsonb;
