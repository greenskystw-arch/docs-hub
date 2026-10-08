import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";

async function login(formData: FormData) {
  "use server";
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login?error=1");
    }
    throw error;
  }
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;

  return (
    <main className="login">
      <form action={login} className="card">
        <h1>📚 文檔庫</h1>
        {params.error && <p className="error">帳號或密碼錯誤</p>}
        <input name="email" type="email" placeholder="Email" required autoComplete="username" />
        <input name="password" type="password" placeholder="密碼" required autoComplete="current-password" />
        <button className="btn" type="submit" style={{ justifyContent: "center" }}>登入</button>
      </form>
    </main>
  );
}
