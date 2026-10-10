// 分類樹（最多 MAX_DEPTH 層）的共用計算，伺服器與瀏覽器都可使用
export const MAX_DEPTH = 3;

export type FlatCat = { id: string; name: string; color: string; sort: number; parentId: string | null; count: number };

export type TreeNode = FlatCat & {
  depth: number; // 1 = 第一層
  total: number; // 含所有子分類的文件數
  children: TreeNode[];
};

export function buildTree(list: FlatCat[]): TreeNode[] {
  const byId = new Map<string, TreeNode>();
  for (const c of list) byId.set(c.id, { ...c, depth: 1, total: c.count, children: [] });
  const roots: TreeNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  const order = (a: TreeNode, b: TreeNode) => a.sort - b.sort || a.name.localeCompare(b.name, "zh-Hant");
  const walk = (nodes: TreeNode[], depth: number): number => {
    nodes.sort(order);
    let sum = 0;
    for (const n of nodes) {
      n.depth = depth;
      n.total = n.count + walk(n.children, depth + 1);
      sum += n.total;
    }
    return sum;
  };
  walk(roots, 1);
  return roots;
}

// 依樹狀順序攤平（父在前、子在後）
export function flatten(roots: TreeNode[]): TreeNode[] {
  const out: TreeNode[] = [];
  const walk = (nodes: TreeNode[]) => {
    for (const n of nodes) {
      out.push(n);
      walk(n.children);
    }
  };
  walk(roots);
  return out;
}

// 自己 + 所有子孫的 id
export function subtreeIds(list: { id: string; parentId: string | null }[], id: string): string[] {
  const out = [id];
  for (let i = 0; i < out.length; i++) {
    for (const c of list) if (c.parentId === out[i]) out.push(c.id);
  }
  return out;
}

// 從第一層到自己的路徑
export function pathOf<T extends { id: string; parentId: string | null }>(list: T[], id: string | null): T[] {
  const byId = new Map(list.map((c) => [c.id, c]));
  const out: T[] = [];
  let cur = id ? byId.get(id) : undefined;
  while (cur && out.length < 10) {
    out.unshift(cur);
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return out;
}

export function depthOf(list: { id: string; parentId: string | null }[], id: string | null) {
  return pathOf(list, id).length;
}

// 子樹高度：只有自己 = 1
export function heightOf(list: { id: string; parentId: string | null }[], id: string): number {
  const kids = list.filter((c) => c.parentId === id);
  return 1 + (kids.length ? Math.max(...kids.map((k) => heightOf(list, k.id))) : 0);
}

export const PATH_SEP = " › ";

// 下拉選單用：依樹狀順序、以縮排表示層級
export function categoryOptions(list: FlatCat[]) {
  return flatten(buildTree(list)).map((n) => ({
    id: n.id,
    name: n.depth > 1 ? `${"　".repeat(n.depth - 1)}└ ${n.name}` : n.name,
  }));
}
