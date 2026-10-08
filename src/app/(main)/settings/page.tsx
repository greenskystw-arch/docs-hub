import { auth } from "@/auth";
import { ThemePicker } from "@/components/ThemePicker";
import { logout } from "@/lib/actions";
import { getTheme } from "@/lib/data";

export default async function SettingsPage() {
  const [theme, session] = await Promise.all([getTheme(), auth()]);

  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      <section className="card">
        <h2>配色主題</h2>
        <ThemePicker current={theme} />
      </section>
      <section className="card">
        <h2>帳號</h2>
        <form action={logout} style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
          <span className="note">{session?.user?.email}</span>
          <button className="btn danger small" type="submit">登出</button>
        </form>
      </section>
    </div>
  );
}
