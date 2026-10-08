import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/Markdown";
import { PrintButton } from "@/components/PrintButton";
import { loadSharedDocument } from "@/lib/data";
import { formatDate } from "@/lib/text";

// 公開唯讀頁：不需登入，不讓搜尋引擎收錄
export async function generateMetadata({ params }: PageProps<"/s/[token]">): Promise<Metadata> {
  const { token } = await params;
  const doc = await loadSharedDocument(token);
  return { title: doc?.title ?? "找不到文件", robots: { index: false, follow: false } };
}

export default async function SharedDocPage({ params }: PageProps<"/s/[token]">) {
  const { token } = await params;
  const doc = await loadSharedDocument(token);
  if (!doc) notFound();

  return (
    <div className="shell">
      <div className="doc-view">
        <article className="card">
          <div className="doc-head">
            <h1>{doc.title}</h1>
            <div className="doc-actions">
              <PrintButton title={doc.title} />
            </div>
          </div>
          <div className="doc-meta">
            <span>更新 {formatDate(doc.updatedAt)} · 建立 {formatDate(doc.createdAt)}</span>
          </div>
          {doc.content.trim() ? <Markdown>{doc.content}</Markdown> : <p className="empty">這份文件還沒有內容</p>}
        </article>
        <p className="note share-foot">📚 由文檔庫分享的唯讀文件</p>
      </div>
    </div>
  );
}
