"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isThemeId } from "@/lib/themes";
import { isCategoryColor } from "@/lib/colors";
import { parseTags } from "@/lib/text";
import { depthOf, heightOf, MAX_DEPTH, subtreeIds } from "@/lib/categoryTree";

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

/* ===== 分享（公開唯讀連結） ===== */

export async function enableShare(id: string): Promise<{ token?: string }> {
  await requireUser();
  const doc = await prisma.document.findUnique({ where: { id }, select: { shareToken: true, updatedAt: true } });
  if (!doc) return {};
  if (doc.shareToken) return { token: doc.shareToken };
  const token = randomBytes(18).toString("base64url");
  // 開啟分享不算內容修改，保留原本的更新時間
  await prisma.document.update({ where: { id }, data: { shareToken: token, updatedAt: doc.updatedAt } });
  refresh();
  return { token };
}

export async function disableShare(id: string) {
  await requireUser();
  const doc = await prisma.document.findUnique({ where: { id }, select: { updatedAt: true } });
  if (!doc) return;
  await prisma.document.update({ where: { id }, data: { shareToken: null, updatedAt: doc.updatedAt } });
  refresh();
}

/* ===== 分類（樹狀，最多 MAX_DEPTH 層） ===== */

async function allCats() {
  return prisma.category.findMany({
    select: { id: true, name: true, parentId: true, sort: true },
    orderBy: [{ sort: "asc" }, { createdAt: "asc" }],
  });
}

// 同一層（同一個上層）內不可重名
function nameTaken(list: { id: string; name: string; parentId: string | null }[], name: string, parentId: string | null, selfId?: string) {
  return list.some((c) => c.parentId === parentId && c.name === name && c.id !== selfId);
}

export async function createCategory(name: string, color: string, parentId: string | null): Promise<{ error?: string }> {
  await requireUser();
  const clean = name.trim().slice(0, 30);
  if (!clean) return { error: "請輸入分類名稱" };
  const list = await allCats();
  const parent = parentId ? list.find((c) => c.id === parentId) : undefined;
  if (parentId && !parent) return { error: "找不到上層分類" };
  if (parent && depthOf(list, parent.id) >= MAX_DEPTH) return { error: `分類最多 ${MAX_DEPTH} 層` };
  if (nameTaken(list, clean, parent?.id ?? null)) return { error: "同一層已有同名分類" };
  const siblings = list.filter((c) => c.parentId === (parent?.id ?? null));
  await prisma.category.create({
    data: {
      name: clean,
      color: isCategoryColor(color) ? color : "green",
      parentId: parent?.id ?? null,
      sort: siblings.length ? Math.max(...siblings.map((c) => c.sort)) + 1 : 0,
    },
  });
  refresh();
  return {};
}

// 改名、換色、移到其他上層（不可移到自己底下，也不可超過層數上限）
export async function updateCategory(
  id: string,
  name: string,
  color: string,
  parentId: string | null,
): Promise<{ error?: string }> {
  await requireUser();
  const clean = name.trim().slice(0, 30);
  if (!clean) return { error: "請輸入分類名稱" };
  const list = await allCats();
  const self = list.find((c) => c.id === id);
  if (!self) return { error: "找不到分類" };
  const newParent = parentId ? list.find((c) => c.id === parentId) : undefined;
  if (parentId && !newParent) return { error: "找不到上層分類" };
  if (newParent && subtreeIds(list, id).includes(newParent.id)) return { error: "不能移到自己或自己的子分類底下" };
  const parentDepth = newParent ? depthOf(list, newParent.id) : 0;
  if (parentDepth + heightOf(list, id) > MAX_DEPTH) return { error: `移過去會超過 ${MAX_DEPTH} 層` };
  if (nameTaken(list, clean, newParent?.id ?? null, id)) return { error: "同一層已有同名分類" };

  const moved = (newParent?.id ?? null) !== self.parentId;
  const siblings = list.filter((c) => c.parentId === (newParent?.id ?? null) && c.id !== id);
  await prisma.category.update({
    where: { id },
    data: {
      name: clean,
      ...(isCategoryColor(color) ? { color } : {}),
      parentId: newParent?.id ?? null,
      // 換到新的上層時排在最後
      ...(moved ? { sort: siblings.length ? Math.max(...siblings.map((c) => c.sort)) + 1 : 0 } : {}),
    },
  });
  refresh();
  return {};
}

// 在同一層內上下移動
export async function moveCategory(id: string, dir: -1 | 1) {
  await requireUser();
  const list = await allCats();
  const self = list.find((c) => c.id === id);
  if (!self) return;
  const siblings = list.filter((c) => c.parentId === self.parentId);
  const i = siblings.findIndex((c) => c.id === id);
  const j = i + dir;
  if (j < 0 || j >= siblings.length) return;
  [siblings[i], siblings[j]] = [siblings[j], siblings[i]];
  await prisma.$transaction(
    siblings.map((c, idx) => prisma.category.update({ where: { id: c.id }, data: { sort: idx } })),
  );
  refresh();
}

// 刪除分類：子分類與文件往上移一層（第一層的文件變成「未分類」），不會刪掉任何文件
export async function deleteCategory(id: string): Promise<{ error?: string }> {
  await requireUser();
  const list = await allCats();
  const self = list.find((c) => c.id === id);
  if (!self) return {};
  const children = list.filter((c) => c.parentId === id);
  const others = list.filter((c) => c.id !== id);
  const clash = children.find((ch) => nameTaken(others, ch.name, self.parentId));
  if (clash) return { error: `上一層已有「${clash.name}」，請先把子分類改名或移走` };
  const base = Math.max(-1, ...others.filter((c) => c.parentId === self.parentId).map((c) => c.sort)) + 1;
  await prisma.$transaction([
    ...children.map((ch, i) =>
      prisma.category.update({ where: { id: ch.id }, data: { parentId: self.parentId, sort: base + i } }),
    ),
    prisma.document.updateMany({ where: { categoryId: id }, data: { categoryId: self.parentId } }),
    prisma.category.delete({ where: { id } }),
  ]);
  refresh();
  return {};
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
