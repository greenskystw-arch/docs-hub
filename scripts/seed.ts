import "dotenv/config";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../src/generated/prisma/client";

// 建立幾個預設分類與一份使用說明（已存在就略過）
const prisma = new PrismaClient({
  adapter: new PrismaLibSql({ url: process.env.DATABASE_URL ?? "file:./dev.db", authToken: process.env.DATABASE_AUTH_TOKEN }),
});

const GUIDE = `歡迎使用文檔庫！這份文件示範支援的 Markdown 語法，可以直接編輯或刪除。

## 基本操作

- 左側選**分類**、點 **#標籤** 篩選；上方可搜尋標題與內容
- 「分類」頁可新增、改名、換顏色、排序或刪除分類（文件不會被刪）
- 編輯器支援 \`Ctrl+S\` 儲存、\`Ctrl+B\` 粗體、\`Ctrl+K\` 連結
- 可以匯入現有的 \`.md\` 檔，也可以把文件下載成 \`.md\`

## 待辦清單

- [x] 建立文檔庫
- [ ] 新增自己的分類
- [ ] 寫第一份筆記

## 表格

| 功能 | 說明 |
| --- | --- |
| 分類 | 每份文件一個 |
| 標籤 | 每份文件可多個 |

## 程式碼

\`\`\`ts
console.log("hello, docs");
\`\`\`

> 引用文字會這樣顯示。
`;

async function main() {
  const names = [
    { name: "工作", color: "blue" },
    { name: "學習", color: "purple" },
    { name: "生活", color: "green" },
  ];
  for (const [i, c] of names.entries()) {
    await prisma.category.upsert({ where: { name: c.name }, create: { ...c, sort: i }, update: {} });
  }
  if ((await prisma.document.count()) === 0) {
    await prisma.document.create({
      data: {
        title: "使用說明",
        content: GUIDE,
        pinned: true,
        tags: { connectOrCreate: [{ where: { name: "說明" }, create: { name: "說明" } }] },
      },
    });
  }
  console.log("seeded");
}

main().finally(() => prisma.$disconnect());
