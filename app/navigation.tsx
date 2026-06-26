import type { ReactNode } from "react";
import Link from "next/link";
import { FileText, History, Star, Trophy } from "lucide-react";

import clubGlyph from "./images/club.svg";

export type RailSection = "pools" | "history" | "winners" | "docs";

const railItems: Array<{
  section: RailSection;
  href: string;
  label: string;
  icon: ReactNode;
}> = [
  { section: "pools", href: "/", label: "Pools", icon: <Star /> },
  { section: "history", href: "/history", label: "History", icon: <History /> },
  { section: "winners", href: "/winners", label: "Winners", icon: <Trophy /> },
  { section: "docs", href: "/docs", label: "Docs", icon: <FileText /> }
];

export function SideRail({ active }: { active: RailSection }) {
  return (
    <aside className="side-rail" aria-label="Primary navigation">
      {railItems.map((item) => (
        <Link
          key={item.section}
          className={`rail-button ${active === item.section ? "active" : "muted"}`}
          href={item.href}
          aria-label={item.label}
          aria-current={active === item.section ? "page" : undefined}
        >
          {item.icon}
        </Link>
      ))}
    </aside>
  );
}

export function BrandLink() {
  return (
    <Link className="brand" href="/" aria-label="ION Lottery">
      <span className="brand-mark" aria-hidden="true">
        <img src={clubGlyph.src} alt="" />
      </span>
      <span>ION Lottery</span>
    </Link>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <p>© 2026 ION Lottery Protocol. All rights reserved.</p>
      <nav aria-label="Footer links">
        <Link href="/docs">Whitepaper</Link>
        <Link href="/docs">Terms</Link>
        <Link href="/docs">Privacy</Link>
        <Link href="/docs">Twitter</Link>
      </nav>
    </footer>
  );
}

export function StaticPageShell({
  active,
  eyebrow,
  title,
  children
}: {
  active: RailSection;
  eyebrow: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="app-shell">
      <SideRail active={active} />
      <main className="dashboard">
        <header className="topbar">
          <BrandLink />
          <div className="topbar-actions">
            <Link className="wallet-button" href="/">
              Back to pools
            </Link>
          </div>
        </header>
        <div className="dashboard-content">
          <section className="info-hero">
            <div className="eyebrow">{eyebrow}</div>
            <h1>{title}</h1>
          </section>
          {children}
        </div>
        <Footer />
      </main>
    </div>
  );
}
