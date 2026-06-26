import { FileText, RefreshCw, ShieldCheck, Ticket } from "lucide-react";

import { StaticPageShell } from "../navigation";

export default function DocsPage() {
  return (
    <StaticPageShell active="docs" eyebrow={<><FileText /> Protocol notes</>} title="How ION Lottery works.">
      <section className="info-grid docs-grid">
        <article className="info-card">
          <span className="info-icon">
            <Ticket />
          </span>
          <span className="info-label">Tickets</span>
          <p>Daily tickets start at 10,000 ION. Weekly tickets start at 100,000 ION.</p>
        </article>
        <article className="info-card">
          <span className="info-icon">
            <RefreshCw />
          </span>
          <span className="info-label">Draws</span>
          <p>Daily draws open after midnight UTC. Weekly draws open after Sunday 23:59:59 UTC.</p>
        </article>
        <article className="info-card">
          <span className="info-icon">
            <ShieldCheck />
          </span>
          <span className="info-label">Fees</span>
          <p>80% of each pool goes to the winner. 20% is retained by the protocol.</p>
        </article>
      </section>
    </StaticPageShell>
  );
}
