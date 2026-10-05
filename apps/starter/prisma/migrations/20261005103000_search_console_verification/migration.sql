ALTER TABLE "search_console_bindings"
  ADD COLUMN "verification_file_name" VARCHAR(200),
  ADD COLUMN "verification_content" TEXT,
  ADD COLUMN "verification_content_type" VARCHAR(40),
  ADD COLUMN "verification_uploaded_at" TIMESTAMPTZ(3);
