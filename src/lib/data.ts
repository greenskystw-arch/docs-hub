import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { isThemeId, type ThemeId } from "@/lib/themes";

export async function getTheme(): Promise<ThemeId> {
  await connection();
  const row = await prisma.setting.findUnique({ where: { key: "theme" } });
  const value = row?.value;
  return isThemeId(value) ? value : "auto";
}

export async function loadCategories() {
  await connection();
  return prisma.category.findMany({
    orderBy: [{ sort: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { documents: true } } },
  });
}

export async function loadTags() {
  await connection();
  return prisma.tag.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { documents: true } } },
  });
}

export type DocFilter = { cat?: string; tag?: string; q?: string; sort?: string; dir?: string };

export const SORT_FIELDS = ["updated", "created", "title"] as const;
export type SortField = (typeof SORT_FIELDS)[number];

// 預設：日期新到舊、標題 A→Z
export function normalizeSort(sort?: string, dir?: string): { field: SortField; dir: "asc" | "desc" } {
  const field = (SORT_FIELDS as readonly string[]).includes(sort ?? "") ? (sort as SortField) : "updated";
  const d = dir === "asc" || dir === "desc" ? dir : field === "title" ? "asc" : "desc";
  return { field, dir: d };
}

export async function loadDocuments(f: DocFilter) {
  await connection();
  const q = f.q?.trim();
  const s = normalizeSort(f.sort, f.dir);
  const key = s.field === "created" ? "createdAt" : s.field === "title" ? "title" : "updatedAt";
  return prisma.document.findMany({
    where: {
      ...(f.cat === "none" ? { categoryId: null } : f.cat ? { categoryId: f.cat } : {}),
      ...(f.tag ? { tags: { some: { name: f.tag } } } : {}),
      ...(q ? { OR: [{ title: { contains: q } }, { content: { contains: q } }] } : {}),
    },
    orderBy: [{ pinned: "desc" }, { [key]: s.dir }],
    include: { category: true, tags: { orderBy: { name: "asc" } } },
  });
}

export async function loadDocument(id: string) {
  await connection();
  return prisma.document.findUnique({
    where: { id },
    include: { category: true, tags: { orderBy: { name: "asc" } } },
  });
}

// 公開分享頁用：只回傳標題、內容與日期
export async function loadSharedDocument(token: string) {
  await connection();
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null;
  return prisma.document.findUnique({
    where: { shareToken: token },
    select: { title: true, content: true, createdAt: true, updatedAt: true },
  });
}

export async function countDocs() {
  await connection();
  const [all, none] = await Promise.all([
    prisma.document.count(),
    prisma.document.count({ where: { categoryId: null } }),
  ]);
  return { all, none };
}
