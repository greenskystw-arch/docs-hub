import { notFound } from "next/navigation";
import { DocEditor } from "@/components/DocEditor";
import { loadCategories, loadDocument, loadTags } from "@/lib/data";
import { categoryOptions } from "@/lib/categoryTree";

export default async function EditDocPage({ params }: PageProps<"/docs/[id]/edit">) {
  const { id } = await params;
  const [doc, cats, tags] = await Promise.all([loadDocument(id), loadCategories(), loadTags()]);
  if (!doc) notFound();

  return (
    <DocEditor
      key={doc.id}
      initial={{
        id: doc.id,
        title: doc.title,
        content: doc.content,
        categoryId: doc.categoryId ?? "",
        tags: doc.tags.map((t) => t.name).join(", "),
        pinned: doc.pinned,
      }}
      categories={categoryOptions(cats)}
      tagNames={tags.map((t) => t.name)}
    />
  );
}
