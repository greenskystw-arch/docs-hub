import { CategoryManager } from "@/components/CategoryManager";
import { TagManager } from "@/components/TagManager";
import { loadCategories, loadTags } from "@/lib/data";

export default async function CategoriesPage() {
  const [cats, tags] = await Promise.all([loadCategories(), loadTags()]);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <section className="card">
        <h2>分類 <small>最多三層（例：學習 › 課程 › 章節）；刪除分類不會刪除文件</small></h2>
        <CategoryManager categories={cats} />
      </section>
      <section className="card">
        <h2>標籤 <small>一份文件可有多個標籤；沒有文件使用的標籤會自動移除</small></h2>
        <TagManager tags={tags.map((t) => ({ id: t.id, name: t.name, count: t._count.documents }))} />
      </section>
    </div>
  );
}
