-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "locales" TEXT[] DEFAULT ARRAY['en', 'fa']::TEXT[];
