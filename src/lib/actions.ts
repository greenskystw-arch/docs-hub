"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isThemeId } from "@/lib/themes";
import { isCategoryColor } from "@/lib/colors";
import { parseTags } from "@/lib/text";

async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("未登入");
}

const refresh = () => revalidatePath("/", "layout");

// 沒有任何文件使用的標籤自動清掉
async function pruneTags() {
  await prisma.tag.deleteMany({ where: { documents: { none: {} } } });
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}

export async function setTheme(theme: string) {
  await requireUser();
  if (!isThemeId(theme)) return;
  await prisma.setting.upsert({
    where: { key: "theme" },
    create: { key: "theme", value: theme },
    update: { value: theme },
  });
  refresh();
}

/* ===== 文件 ===== */

export type DocInput = {
  id?: string;
  title: string;
  content: string;
  categoryId: string;
  tags: string;
  pinned: boolean;
};

export async function saveDocument(input: DocInput): Promise<{ id?: string; error?: string }> {
  await requireUser();
  const title = input.title.trim().slice(0, 200);
  if (!title) return { error: "請輸入標題" };
  const content = input.content.replace(/\r\n/g, "\n").slice(0, 500_000);
  const categoryId = input.categoryId
    ? ((await prisma.category.findUnique({ where: { id: input.categoryId } }))?.id ?? null)
    : null;
  const connect = parseTags(input.tags)
    .slice(0, 20)
    .map((name) => ({ where: { name }, create: { name } }));
  const data = { title, content, categoryId, pinned: !!input.pinned };

  const doc = input.id
    ? await prisma.document.update({
        where: { id: input.id },
        data: { ...data, tags: { set: [], connectOrCreate: connect } },
      })
    : await prisma.document.create({ data: { ...data, tags: { connectOrCreate: connect } } });
  await pruneTags();
  refresh();
  return { id: doc.id };
}

export async function deleteDocument(id: string) {
  await requireUser();
  await prisma.document.delete({ where: { id } });
  await pruneTags();
  refresh();
  redirect("/");
}

export async function togglePin(id: string, pinned: boolean) {
  await requireUser();
  // 置頂不算內容修改，保留原本的更新時間
  const doc = await prisma.document.findUnique({ where: { id }, select: { updatedAt: true } });
  if (!doc) return;
  await prisma.document.update({ where: { id }, data: { pinned, updatedAt: doc.updatedAt } });
  refresh();
}

/* ===== 分類 ===== */

export async function createCategory(name: string, color: string): Promise<{ error?: string }> {
  await requireUser();
  const clean = name.trim().slice(0, 30);
  if (!clean) return { error: "請輸入分類名稱" };
  if (await prisma.category.findUnique({ where: { name: clean } })) return { error: "已有同名分類" };
  const max = await prisma.category.aggregate({ _max: { sort: true } });
  await prisma.category.create({
    data: { name: clean, color: isCategoryColor(color) ? color : "green", sort: (max._max.sort ?? 0) + 1 },
  });
  refresh();
  return {};
}

export async function updateCategory(id: string, name: string, color: string): Promise<{ error?: string }> {
  await requireUser();
  const clean = name.trim().slice(0, 30);
  if (!clean) return { error: "請輸入分類名稱" };
  const dup = await prisma.category.findUnique({ where: { name: clean } });
  if (dup && dup.id !== id) return { error: "已有同名分類" };
  await prisma.category.update({
    where: { id },
    data: { name: clean, ...(isCategoryColor(color) ? { color } : {}) },
  });
  refresh();
  return {};
}

export async function moveCategory(id: string, dir: -1 | 1) {
  await requireUser();
  const list = await prisma.category.findMany({ orderBy: [{ sort: "asc" }, { createdAt: "asc" }] });
  const i = list.findIndex((c) => c.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  await prisma.$transaction(
    list.map((c, idx) => prisma.category.update({ where: { id: c.id }, data: { sort: idx } })),
  );
  refresh();
}

// 刪除分類：文件不會刪，變成「未分類」
export async function deleteCategory(id: string) {
  await requireUser();
  await prisma.category.delete({ where: { id } });
  refresh();
}

/* ===== 標籤 ===== */

export async function renameTag(id: string, name: string): Promise<{ error?: string }> {
  await requireUser();
  const clean = parseTags(name)[0];
  if (!clean) return { error: "請輸入標籤名稱" };
  const tag = await prisma.tag.findUnique({ where: { id }, include: { documents: { select: { id: true } } } });
  if (!tag) return {};
  const target = await prisma.tag.findUnique({ where: { name: clean } });
  if (target && target.id !== id) {
    // 改成已存在的名稱 → 合併
    await prisma.tag.update({ where: { id: target.id }, data: { documents: { connect: tag.documents } } });
    await prisma.tag.delete({ where: { id } });
  } else {
    await prisma.tag.update({ where: { id }, data: { name: clean } });
  }
  refresh();
  return {};
}

export async function deleteTag(id: string) {
  await requireUser();
  await prisma.tag.delete({ where: { id } });
  refresh();
}
