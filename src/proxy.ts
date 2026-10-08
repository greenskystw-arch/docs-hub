import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth({ ...authConfig, trustHost: true });

export default auth;

export const config = {
  // 不需登入：NextAuth、公開分享頁 /s/…
  matcher: ["/((?!api/auth|s/|_next/static|_next/image|favicon.ico).*)"],
};
