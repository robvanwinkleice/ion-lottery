import { Trophy } from "lucide-react";

import { StaticPageShell } from "../navigation";
import { WinnersPanel } from "../winners-panel";

export default function WinnersPage() {
  return (
    <StaticPageShell active="winners" eyebrow={<><Trophy /> Winners</>} title="Winning wallets.">
      <WinnersPanel />
    </StaticPageShell>
  );
}
