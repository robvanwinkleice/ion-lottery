import { History, Ticket, Trophy } from "lucide-react";

import { StaticPageShell } from "../navigation";

export default function HistoryPage() {
  return (
    <StaticPageShell active="history" eyebrow={<><History /> Round activity</>} title="Lottery history.">
      <section className="info-grid">
        <article className="info-card wide">
          <span className="info-label">Status</span>
          <h2>Round history will appear after the first completed draws.</h2>
          <p>
            This page is reserved for completed daily and weekly rounds, including pool size, winner address,
            prize amount, and retained protocol fee.
          </p>
        </article>
        <article className="info-card">
          <span className="info-icon">
            <Ticket />
          </span>
          <span className="info-label">Daily</span>
          <strong>Pending first draw</strong>
        </article>
        <article className="info-card">
          <span className="info-icon">
            <Trophy />
          </span>
          <span className="info-label">Weekly</span>
          <strong>Pending first draw</strong>
        </article>
      </section>
    </StaticPageShell>
  );
}
