import { Trophy } from "lucide-react";

import { StaticPageShell } from "../../navigation";
import { WinnersPanel } from "../../winners-panel";

export default function ChineseWinnersPage() {
  return (
    <StaticPageShell active="winners" locale="zh" eyebrow={<><Trophy /> 获奖者</>} title="中奖钱包。">
      <WinnersPanel locale="zh" />
    </StaticPageShell>
  );
}
