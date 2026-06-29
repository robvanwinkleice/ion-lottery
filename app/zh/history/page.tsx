import { History } from "lucide-react";

import { StaticPageShell } from "../../navigation";
import { HistoryPanel } from "../../history-panel";

export default function ChineseHistoryPage() {
  return (
    <StaticPageShell active="history" locale="zh" eyebrow={<><History /> 轮次活动</>} title="彩票开奖历史。">
      <HistoryPanel locale="zh" />
    </StaticPageShell>
  );
}
