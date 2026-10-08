import { DocEditor } from "@/components/DocEditor";
import { loadCategories, loadTags } from "@/lib/data";

export default async function NewDocPage({ searchParams }: PageProps<"/docs/new">) {
  const sp = await searchParams;
  const [cats, tags] = await Promise.all([loadCategories(), loadTags()]);
  const cat = typeof sp.cat === "string" && cats.some((c) => c.id === sp.cat) ? sp.cat : "";

  return (
    <DocEditor
      initial={{ title: "", content: "", categoryId: cat, tags: "", pinned: false }}
      categories={cats.map((c) => ({ id: c.id, name: c.name }))}
      tagNames={tags.map((t) => t.name)}
    />
  );
}
