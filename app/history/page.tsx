import { History } from "lucide-react";

import { StaticPageShell } from "../navigation";
import { HistoryPanel } from "../history-panel";

export default function HistoryPage() {
  return (
    <StaticPageShell active="history" eyebrow={<><History /> Round activity</>} title="Lottery history.">
      <HistoryPanel />
    </StaticPageShell>
  );
}
