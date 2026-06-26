import { CircleDollarSign, Crown, Trophy } from "lucide-react";

import { StaticPageShell } from "../navigation";

export default function WinnersPage() {
  return (
    <StaticPageShell active="winners" eyebrow={<><Trophy /> Winners</>} title="Winning wallets.">
      <section className="info-grid">
        <article className="info-card wide">
          <span className="info-label">Leaderboard</span>
          <h2>Winners will be listed once draws are completed.</h2>
          <p>
            Each winner entry should show the wallet address, pool type, round number, draw time, and 80% prize
            payout.
          </p>
        </article>
        <article className="info-card">
          <span className="info-icon">
            <Crown />
          </span>
          <span className="info-label">Latest winner</span>
          <strong>None yet</strong>
        </article>
        <article className="info-card">
          <span className="info-icon">
            <CircleDollarSign />
          </span>
          <span className="info-label">Winner payout</span>
          <strong>80%</strong>
        </article>
      </section>
    </StaticPageShell>
  );
}
