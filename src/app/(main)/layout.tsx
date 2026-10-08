import Link from "next/link";
import { Nav } from "@/components/Nav";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      <header className="top">
        <h1><Link href="/">📚 文檔庫</Link></h1>
        <Nav />
      </header>
      {children}
    </div>
  );
}
