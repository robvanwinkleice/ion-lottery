import { History, Ticket, Trophy } from "lucide-react";

import { StaticPageShell } from "../../navigation";

export default function ChineseHistoryPage() {
  return (
    <StaticPageShell active="history" locale="zh" eyebrow={<><History /> 轮次活动</>} title="彩票开奖历史。">
      <section className="info-grid">
        <article className="info-card wide">
          <span className="info-label">状态</span>
          <h2>首次开奖完成后，轮次历史将在这里显示。</h2>
          <p>
            这里会记录已完成的每日和每周轮次，包括奖池规模、中奖钱包、奖金金额和协议保留费用。
          </p>
        </article>
        <article className="info-card">
          <span className="info-icon">
            <Ticket />
          </span>
          <span className="info-label">每日</span>
          <strong>等待首次开奖</strong>
        </article>
        <article className="info-card">
          <span className="info-icon">
            <Trophy />
          </span>
          <span className="info-label">每周</span>
          <strong>等待首次开奖</strong>
        </article>
      </section>
    </StaticPageShell>
  );
}
