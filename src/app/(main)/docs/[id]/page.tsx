import Link from "next/link";
import { notFound } from "next/navigation";
import { DocActions } from "@/components/DocActions";
import { Markdown } from "@/components/Markdown";
import { loadDocument } from "@/lib/data";
import { colorHex } from "@/lib/colors";
import { formatDate } from "@/lib/text";

export default async function DocPage({ params }: PageProps<"/docs/[id]">) {
  const { id } = await params;
  const doc = await loadDocument(id);
  if (!doc) notFound();

  return (
    <div className="doc-view">
      <Link href={doc.category ? `/?cat=${doc.category.id}` : "/"} className="back">
        ← {doc.category ? doc.category.name : "全部文件"}
      </Link>
      <article className="card">
        <div className="doc-head">
          <h1>{doc.pinned && <span className="pin">📌 </span>}{doc.title}</h1>
          <DocActions id={doc.id} title={doc.title} pinned={doc.pinned} markdown={doc.content} shareToken={doc.shareToken} />
        </div>
        <div className="doc-meta">
          {doc.category ? (
            <Link href={`/?cat=${doc.category.id}`} className="cat" style={{ "--c": colorHex(doc.category.color) } as React.CSSProperties}>
              {doc.category.name}
            </Link>
          ) : (
            <span>未分類</span>
          )}
          {doc.tags.map((t) => (
            <Link key={t.id} href={`/?tag=${encodeURIComponent(t.name)}`} className="tag">#{t.name}</Link>
          ))}
          <span style={{ marginLeft: "auto" }}>
            更新 {formatDate(doc.updatedAt)} · 建立 {formatDate(doc.createdAt)}
          </span>
        </div>
        {doc.content.trim() ? <Markdown>{doc.content}</Markdown> : <p className="empty">這份文件還沒有內容</p>}
      </article>
    </div>
  );
}
