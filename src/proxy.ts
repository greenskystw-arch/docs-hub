import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth({ ...authConfig, trustHost: true });

export default auth;

export const config = {
  // 不需登入：NextAuth、公開分享頁 /s/…、App 圖示（iPhone 加入主畫面時要能直接取得，否則會抓到登入頁）
  matcher: ["/((?!api/auth|s/|_next/static|_next/image|favicon.ico|icon|apple-icon).*)"],
};
