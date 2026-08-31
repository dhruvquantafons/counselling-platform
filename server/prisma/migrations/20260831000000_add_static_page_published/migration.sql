-- AlterTable: add published column, default false for new rows
ALTER TABLE "StaticPage" ADD COLUMN "published" BOOLEAN NOT NULL DEFAULT false;

-- Set all existing rows to published = true so nothing already live disappears
UPDATE "StaticPage" SET "published" = true;
