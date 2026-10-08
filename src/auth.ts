import { timingSafeEqual } from "node:crypto";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";

// 個人使用：帳號密碼放在環境變數 ADMIN_EMAIL / ADMIN_PASSWORD
function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 90 },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        const adminEmail = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
        const adminPassword = process.env.ADMIN_PASSWORD ?? "";
        if (!adminEmail || !adminPassword) return null;
        if (!safeEqual(email, adminEmail) || !safeEqual(password, adminPassword)) return null;
        return { id: "me", email: adminEmail };
      },
    }),
  ],
});
