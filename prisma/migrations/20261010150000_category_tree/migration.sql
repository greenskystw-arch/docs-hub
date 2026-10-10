-- 分類改為樹狀（最多三層）：拿掉全域唯一名稱，新增 parentId。
-- 只加欄位、不重建資料表，避免影響既有文件的分類。
DROP INDEX "Category_name_key";
ALTER TABLE "Category" ADD COLUMN "parentId" TEXT REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");
