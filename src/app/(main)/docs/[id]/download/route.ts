import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { safeFileName } from "@/lib/text";

// 下載單一文件為 .md（第一行放標題）
export async function GET(_req: Request, ctx: RouteContext<"/docs/[id]/download">) {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });
  const { id } = await ctx.params;
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) return new Response("Not found", { status: 404 });

  const body = `# ${doc.title}\n\n${doc.content}${doc.content.endsWith("\n") ? "" : "\n"}`;
  const name = encodeURIComponent(`${safeFileName(doc.title)}.md`);
  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="document.md"; filename*=UTF-8''${name}`,
    },
  });
}
