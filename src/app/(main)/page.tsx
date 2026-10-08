import Link from "next/link";
import { countDocs, loadCategories, loadDocuments, loadTags, normalizeSort, type SortField } from "@/lib/data";
import { colorHex } from "@/lib/colors";
import { excerpt, formatDate, formatDay } from "@/lib/text";

type Params = { cat?: string; tag?: string; q?: string; sort?: string; dir?: string };

function one(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

// 保留其他篩選條件，只改其中幾個
function href(base: Params, patch: Partial<Params>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...base, ...patch })) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `/?${s}` : "/";
}

// 可排序的欄位標題：點同一欄切換遞增/遞減
function SortHead({ f, field, label, className }: { f: Params; field: SortField; label: string; className?: string }) {
  const cur = normalizeSort(f.sort, f.dir);
  const on = cur.field === field;
  const next = on ? (cur.dir === "asc" ? "desc" : "asc") : field === "title" ? "asc" : "desc";
  const isDefault = field === "updated" && next === "desc";
  return (
    <Link
      href={href(f, isDefault ? { sort: undefined, dir: undefined } : { sort: field, dir: next })}
      className={`${className ?? ""} ${on ? "on" : ""}`}
      title={`依${label}排序`}
    >
      {label}
      <span className="arrow">{on ? (cur.dir === "asc" ? "▲" : "▼") : "↕"}</span>
    </Link>
  );
}

export default async function LibraryPage({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const f: Params = { cat: one(sp.cat), tag: one(sp.tag), q: one(sp.q), sort: one(sp.sort), dir: one(sp.dir) };
  const [docs, cats, tags, counts] = await Promise.all([loadDocuments(f), loadCategories(), loadTags(), countDocs()]);
  const curCat = cats.find((c) => c.id === f.cat);
  const newHref = curCat ? `/docs/new?cat=${curCat.id}` : "/docs/new";

  return (
    <div className="lib">
      <aside className="card side">
        <h3>分類 <Link href="/categories">管理</Link></h3>
        <div className="side-list">
          <Link href={href(f, { cat: undefined })} className={!f.cat ? "on" : undefined}>
            <span>📚</span><span className="nm">全部</span><small>{counts.all}</small>
          </Link>
          {cats.map((c) => (
            <Link key={c.id} href={href(f, { cat: c.id })} className={f.cat === c.id ? "on" : undefined}>
              <span className="dot" style={{ "--c": colorHex(c.color) } as React.CSSProperties} />
              <span className="nm">{c.name}</span>
              <small>{c._count.documents}</small>
            </Link>
          ))}
          <Link href={href(f, { cat: "none" })} className={f.cat === "none" ? "on" : undefined}>
            <span className="dot" style={{ "--c": "var(--line)" } as React.CSSProperties} />
            <span className="nm">未分類</span><small>{counts.none}</small>
          </Link>
        </div>
        {tags.length > 0 && (
          <>
            <hr />
            <h3>標籤</h3>
            <div className="tag-cloud">
              {tags.map((t) => (
                <Link
                  key={t.id}
                  href={href(f, { tag: f.tag === t.name ? undefined : t.name })}
                  className={`tag ${f.tag === t.name ? "on" : ""}`}
                >
                  #{t.name} <small>{t._count.documents}</small>
                </Link>
              ))}
            </div>
          </>
        )}
      </aside>

      <section>
        <div className="lib-bar">
          <form action="/" role="search">
            {f.cat && <input type="hidden" name="cat" value={f.cat} />}
            {f.tag && <input type="hidden" name="tag" value={f.tag} />}
            {f.sort && <input type="hidden" name="sort" value={f.sort} />}
            {f.dir && <input type="hidden" name="dir" value={f.dir} />}
            <input type="search" name="q" defaultValue={f.q} placeholder="搜尋標題或內容…" />
          </form>
          <Link href={newHref} className="btn">＋ 新文件</Link>
        </div>

        {(f.tag || f.q) && (
          <div className="filters">
            篩選：
            {f.tag && <Link href={href(f, { tag: undefined })} className="tag on">#{f.tag} ✕</Link>}
            {f.q && <Link href={href(f, { q: undefined })} className="tag on">「{f.q}」 ✕</Link>}
            <span>共 {docs.length} 份</span>
          </div>
        )}

        <div className="card doc-list" style={{ padding: 0 }}>
          <div className="doc-cols doc-headrow">
            <SortHead f={f} field="title" label="標題" />
            <span className="c-cat">分類</span>
            <SortHead f={f} field="created" label="建立日期" className="c-date" />
            <SortHead f={f} field="updated" label="最後更新" className="c-date" />
          </div>
          {docs.length === 0 ? (
            <div className="empty">
              {counts.all === 0 ? (
                <>還沒有文件，<Link href={newHref}>建立第一份</Link></>
              ) : (
                "沒有符合的文件"
              )}
            </div>
          ) : (
            docs.map((d) => (
              <Link key={d.id} href={`/docs/${d.id}`} className="doc-row doc-cols">
                <div className="c-main">
                  <div className="t">
                    {d.pinned && <span className="pin" title="置頂">📌</span>}
                    {d.title}
                  </div>
                  <div className="ex">{excerpt(d.content) || "（空白）"}</div>
                  {d.tags.length > 0 && (
                    <div className="meta">
                      {d.tags.map((t) => (
                        <span key={t.id} className="tag">#{t.name}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="c-cat">
                  {d.category ? (
                    <span className="cat" style={{ "--c": colorHex(d.category.color) } as React.CSSProperties}>
                      {d.category.name}
                    </span>
                  ) : (
                    <span className="note">未分類</span>
                  )}
                </div>
                <div className="c-date">
                  <small>建立 </small>
                  {formatDay(d.createdAt)}
                </div>
                <div className="c-date">
                  <small>更新 </small>
                  {formatDate(d.updatedAt)}
                </div>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
