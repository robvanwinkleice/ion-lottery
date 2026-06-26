import type { ReactNode } from "react";
import Link from "next/link";
import { FileText, History, Star, Trophy } from "lucide-react";

import clubGlyph from "./images/club.svg";

export type RailSection = "pools" | "history" | "winners" | "docs";
export type Locale = "en" | "zh";

const railItems: Array<{
  section: RailSection;
  href: Record<Locale, string>;
  label: Record<Locale, string>;
  icon: ReactNode;
}> = [
  { section: "pools", href: { en: "/", zh: "/zh" }, label: { en: "Pools", zh: "奖池" }, icon: <Star /> },
  { section: "history", href: { en: "/history", zh: "/zh/history" }, label: { en: "History", zh: "历史" }, icon: <History /> },
  { section: "winners", href: { en: "/winners", zh: "/zh/winners" }, label: { en: "Winners", zh: "获奖者" }, icon: <Trophy /> },
  { section: "docs", href: { en: "/docs", zh: "/zh/docs" }, label: { en: "Docs", zh: "文档" }, icon: <FileText /> }
];

function hrefFor(section: RailSection, locale: Locale) {
  return railItems.find((item) => item.section === section)?.href[locale] ?? "/";
}

function switchHref(section: RailSection, locale: Locale) {
  return `${hrefFor(section, locale)}?lang=${locale}`;
}

export function SideRail({ active, locale = "en" }: { active: RailSection; locale?: Locale }) {
  return (
    <aside className="side-rail" aria-label="Primary navigation">
      {railItems.map((item) => (
        <Link
          key={item.section}
          className={`rail-button ${active === item.section ? "active" : "muted"}`}
          href={item.href[locale]}
          aria-label={item.label[locale]}
          aria-current={active === item.section ? "page" : undefined}
        >
          {item.icon}
        </Link>
      ))}
    </aside>
  );
}

export function BrandLink({ locale = "en" }: { locale?: Locale }) {
  return (
    <Link className="brand" href={locale === "zh" ? "/zh" : "/"} aria-label="ION Lottery">
      <span className="brand-mark" aria-hidden="true">
        <img src={clubGlyph.src} alt="" />
      </span>
      <span>ION Lottery</span>
    </Link>
  );
}

export function Footer({ locale = "en" }: { locale?: Locale }) {
  return (
    <footer className="footer">
      <p>{locale === "zh" ? "© 2026 ION Lottery 协议。保留所有权利。" : "© 2026 ION Lottery Protocol. All rights reserved."}</p>
      <nav aria-label="Footer links">
        <Link href={locale === "zh" ? "/zh/docs" : "/docs"}>{locale === "zh" ? "白皮书" : "Whitepaper"}</Link>
        <Link href={locale === "zh" ? "/zh/docs" : "/docs"}>{locale === "zh" ? "条款" : "Terms"}</Link>
        <Link href={locale === "zh" ? "/zh/docs" : "/docs"}>{locale === "zh" ? "隐私" : "Privacy"}</Link>
        <Link href={locale === "zh" ? "/zh/docs" : "/docs"}>Twitter</Link>
      </nav>
    </footer>
  );
}

export function StaticPageShell({
  active,
  eyebrow,
  title,
  locale = "en",
  children
}: {
  active: RailSection;
  eyebrow: ReactNode;
  title: string;
  locale?: Locale;
  children: ReactNode;
}) {
  return (
    <div className="app-shell">
      <SideRail active={active} locale={locale} />
      <main className="dashboard">
        <header className="topbar">
          <BrandLink locale={locale} />
          <div className="topbar-actions">
            <Link className="nav-link" href={switchHref(active, locale === "zh" ? "en" : "zh")}>
              {locale === "zh" ? "English" : "中文"}
            </Link>
            <Link className="wallet-button" href={locale === "zh" ? "/zh" : "/"}>
              {locale === "zh" ? "返回奖池" : "Back to pools"}
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
        <Footer locale={locale} />
      </main>
    </div>
  );
}
