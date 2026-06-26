import { CircleDollarSign, Crown, Trophy } from "lucide-react";

import { StaticPageShell } from "../../navigation";

export default function ChineseWinnersPage() {
  return (
    <StaticPageShell active="winners" locale="zh" eyebrow={<><Trophy /> 获奖者</>} title="中奖钱包。">
      <section className="info-grid">
        <article className="info-card wide">
          <span className="info-label">排行榜</span>
          <h2>开奖完成后，中奖者会在这里列出。</h2>
          <p>
            每条中奖记录会展示钱包地址、奖池类型、轮次编号、开奖时间，以及 80% 的奖金分配。
          </p>
        </article>
        <article className="info-card">
          <span className="info-icon">
            <Crown />
          </span>
          <span className="info-label">最新获奖者</span>
          <strong>暂无</strong>
        </article>
        <article className="info-card">
          <span className="info-icon">
            <CircleDollarSign />
          </span>
          <span className="info-label">中奖分配</span>
          <strong>80%</strong>
        </article>
      </section>
    </StaticPageShell>
  );
}
