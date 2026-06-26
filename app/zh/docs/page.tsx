import { FileText, RefreshCw, ShieldCheck, Ticket } from "lucide-react";

import { StaticPageShell } from "../../navigation";

export default function ChineseDocsPage() {
  return (
    <StaticPageShell active="docs" locale="zh" eyebrow={<><FileText /> 协议说明</>} title="ION Lottery 如何运作。">
      <section className="info-grid docs-grid">
        <article className="info-card">
          <span className="info-icon">
            <Ticket />
          </span>
          <span className="info-label">彩票</span>
          <p>每日彩票价格为 1,000 ION。每周彩票价格为 5,000 ION。</p>
        </article>
        <article className="info-card">
          <span className="info-icon">
            <RefreshCw />
          </span>
          <span className="info-label">开奖</span>
          <p>每日开奖在 UTC 午夜后开放。每周开奖在周日 23:59:59 UTC 之后开放。</p>
        </article>
        <article className="info-card">
          <span className="info-icon">
            <ShieldCheck />
          </span>
          <span className="info-label">费用</span>
          <p>每个奖池的 80% 发给中奖者，20% 由协议保留。</p>
        </article>
      </section>
    </StaticPageShell>
  );
}
