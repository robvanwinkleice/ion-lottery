"use client";

import { useCallback, useEffect, useState } from "react";
import { CircleDollarSign, ExternalLink, History, RefreshCw, Ticket, Trophy } from "lucide-react";

import type { Locale } from "./navigation";

type PoolKey = "daily" | "weekly";

type RuntimeKit = {
  Address: typeof import("@ton/core").Address;
  TonClient: typeof import("@ton/ton").TonClient;
  Lottery: typeof import("../build/Lottery/Lottery_Lottery").Lottery;
};

type HistoryEntry = {
  key: PoolKey;
  poolLabel: string;
  currentRound: bigint;
  completedRound: bigint | null;
  cutoffAt: bigint | null;
  nextDrawAt: bigint;
  participants: bigint;
  currentPool: bigint;
  winner: string | null;
  prize: bigint;
};

const DEFAULT_ENDPOINT =
  process.env.NEXT_PUBLIC_ION_ENDPOINT ?? "https://api.mainnet.ice.io/http/v2/jsonRPC";
const DEFAULT_CONTRACT = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "";
const EXPLORER_BASE = "https://explorer.ice.io/address";
const REFRESH_INTERVAL_MS = 30000;

const historyCopy = {
  en: {
    status: "Status",
    introTitle: "Latest completed round history.",
    introBody:
      "This contract stores the latest completed daily and weekly round on-chain. Older rounds are not retained by the current contract state.",
    refresh: "Refresh",
    loading: "Loading history.",
    loaded: "History updated.",
    missingContract: "Lottery contract address is not configured.",
    daily: "Daily",
    weekly: "Weekly",
    latestCompleted: "Latest completed",
    currentRound: "Current round",
    noCompletedRound: "No completed round",
    winner: "Winner",
    prize: "Prize",
    pool: "Pool",
    protocolFee: "Protocol fee",
    cutoff: "Cutoff",
    nextDraw: "Next draw",
    entries: "Entries",
    viewWallet: "View wallet",
    unavailable: "Unavailable"
  },
  zh: {
    status: "状态",
    introTitle: "最新已完成轮次历史。",
    introBody: "当前合约会在链上保留每日和每周奖池的最近一次已完成轮次。更早的轮次不会保存在当前合约状态中。",
    refresh: "刷新",
    loading: "正在加载历史。",
    loaded: "历史已更新。",
    missingContract: "未配置彩票合约地址。",
    daily: "每日",
    weekly: "每周",
    latestCompleted: "最近完成",
    currentRound: "当前轮次",
    noCompletedRound: "暂无完成轮次",
    winner: "中奖者",
    prize: "奖金",
    pool: "奖池",
    protocolFee: "协议费用",
    cutoff: "截止时间",
    nextDraw: "下次开奖",
    entries: "参与人数",
    viewWallet: "查看钱包",
    unavailable: "不可用"
  }
} satisfies Record<Locale, Record<string, string>>;

let runtimePromise: Promise<RuntimeKit> | null = null;

async function loadRuntime() {
  if (!runtimePromise) {
    runtimePromise = (async () => {
      const { Buffer } = await import("buffer");
      globalThis.Buffer ??= Buffer;

      const [tonCore, tonTon, lotteryModule] = await Promise.all([
        import("@ton/core"),
        import("@ton/ton"),
        import("../build/Lottery/Lottery_Lottery")
      ]);

      return {
        Address: tonCore.Address,
        TonClient: tonTon.TonClient,
        Lottery: lotteryModule.Lottery
      };
    })();
  }

  return runtimePromise;
}

export function HistoryPanel({ locale = "en" }: { locale?: Locale }) {
  const copy = historyCopy[locale];
  const [runtime, setRuntime] = useState<RuntimeKit | null>(null);
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [statusText, setStatusText] = useState(copy.loading);
  const [statusKind, setStatusKind] = useState<"idle" | "ok" | "error">("idle");
  const [loading, setLoading] = useState(true);

  const contractAddress = DEFAULT_CONTRACT.trim();

  const loadHistory = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!contractAddress) {
      setEntries([]);
      setStatusText(copy.missingContract);
      setStatusKind("error");
      setLoading(false);
      return;
    }

    if (!silent) {
      setLoading(true);
      setStatusText(copy.loading);
      setStatusKind("idle");
    }

    try {
      const kit = runtime ?? (await loadRuntime());
      setRuntime(kit);

      const client = new kit.TonClient({ endpoint: DEFAULT_ENDPOINT });
      const lottery = client.open(kit.Lottery.fromAddress(kit.Address.parse(contractAddress)));
      const [
        dailyRound,
        dailyDrawUnlockAt,
        dailyParticipantCount,
        dailyPool,
        lastDailyWinner,
        lastDailyPrize,
        weeklyRound,
        weeklyDrawUnlockAt,
        weeklyParticipantCount,
        weeklyPool,
        lastWeeklyWinner,
        lastWeeklyPrize
      ] = await Promise.all([
        lottery.getGetDailyRound(),
        lottery.getGetDailyDrawUnlockAt(),
        lottery.getGetDailyParticipantCount(),
        lottery.getGetDailyPool(),
        lottery.getGetLastDailyWinner(),
        lottery.getGetLastDailyPrize(),
        lottery.getGetWeeklyRound(),
        lottery.getGetWeeklyDrawUnlockAt(),
        lottery.getGetWeeklyParticipantCount(),
        lottery.getGetWeeklyPool(),
        lottery.getGetLastWeeklyWinner(),
        lottery.getGetLastWeeklyPrize()
      ]);

      setEntries([
        {
          key: "daily",
          poolLabel: copy.daily,
          currentRound: dailyRound,
          completedRound: completedRound(dailyRound, lastDailyWinner),
          cutoffAt: previousCutoff("daily", dailyDrawUnlockAt, lastDailyWinner),
          nextDrawAt: dailyDrawUnlockAt,
          participants: dailyParticipantCount,
          currentPool: dailyPool,
          winner: displayOptionalAddress(lastDailyWinner),
          prize: lastDailyPrize
        },
        {
          key: "weekly",
          poolLabel: copy.weekly,
          currentRound: weeklyRound,
          completedRound: completedRound(weeklyRound, lastWeeklyWinner),
          cutoffAt: previousCutoff("weekly", weeklyDrawUnlockAt, lastWeeklyWinner),
          nextDrawAt: weeklyDrawUnlockAt,
          participants: weeklyParticipantCount,
          currentPool: weeklyPool,
          winner: displayOptionalAddress(lastWeeklyWinner),
          prize: lastWeeklyPrize
        }
      ]);
      setStatusText(copy.loaded);
      setStatusKind("ok");
    } catch (error) {
      setEntries([]);
      setStatusText(errorMessage(error));
      setStatusKind("error");
    } finally {
      setLoading(false);
    }
  }, [contractAddress, copy, runtime]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    const interval = window.setInterval(() => void loadHistory({ silent: true }), REFRESH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [loadHistory]);

  return (
    <section className="info-grid history-grid">
      <article className="info-card wide history-summary">
        <div>
          <span className="info-label">{copy.status}</span>
          <h2>{copy.introTitle}</h2>
          <p>{copy.introBody}</p>
        </div>
        <button className="secondary-button compact-button" type="button" disabled={loading} onClick={() => void loadHistory()}>
          {loading ? <span className="spinner button-spinner" /> : <RefreshCw />}
          <span>{copy.refresh}</span>
        </button>
        <div className={`status-line ${statusKind}`}>
          {loading ? <span className="spinner" /> : null}
          <span>{statusText}</span>
        </div>
      </article>
      {entries.map((entry) => (
        <article className="info-card history-card" key={entry.key}>
          <div className="history-card-top">
            <span className={`winner-pool ${entry.key}`}>{entry.poolLabel}</span>
            <History />
          </div>
          <div className="history-highlight">
            <span>{copy.latestCompleted}</span>
            <strong>{entry.completedRound ? `#${entry.completedRound.toString()}` : copy.noCompletedRound}</strong>
          </div>
          <dl className="winner-details">
            <div>
              <dt>{copy.winner}</dt>
              <dd>{shortAddress(entry.winner, copy.unavailable)}</dd>
            </div>
            <div>
              <dt>{copy.prize}</dt>
              <dd>{formatIon(entry.prize)}</dd>
            </div>
            <div>
              <dt>{copy.pool}</dt>
              <dd>{formatIon(inferredCompletedPool(entry.prize))}</dd>
            </div>
            <div>
              <dt>{copy.protocolFee}</dt>
              <dd>{formatIon(inferredProtocolFee(entry.prize))}</dd>
            </div>
            <div>
              <dt>{copy.cutoff}</dt>
              <dd>{entry.cutoffAt ? formatUtc(entry.cutoffAt) : copy.unavailable}</dd>
            </div>
          </dl>
          {entry.winner ? (
            <a className="winner-link" href={`${EXPLORER_BASE}/${entry.winner}`} target="_blank" rel="noreferrer">
              <span>{copy.viewWallet}</span>
              <ExternalLink />
            </a>
          ) : null}
        </article>
      ))}
      {entries.map((entry) => (
        <article className="info-card current-round-card" key={`${entry.key}-current`}>
          <span className="info-icon">
            {entry.key === "daily" ? <Ticket /> : <Trophy />}
          </span>
          <span className="info-label">{entry.poolLabel}</span>
          <strong>{copy.currentRound} #{entry.currentRound.toString()}</strong>
          <dl className="winner-details">
            <div>
              <dt>{copy.entries}</dt>
              <dd>{entry.participants.toString()}</dd>
            </div>
            <div>
              <dt>{copy.pool}</dt>
              <dd>{formatIon(entry.currentPool)}</dd>
            </div>
            <div>
              <dt>{copy.nextDraw}</dt>
              <dd>{formatUtc(entry.nextDrawAt)}</dd>
            </div>
          </dl>
        </article>
      ))}
    </section>
  );
}

function completedRound(round: bigint, winner: unknown) {
  if (!winner || round <= 1n) {
    return null;
  }
  return round - 1n;
}

function previousCutoff(pool: PoolKey, unlockAt: bigint, winner: unknown) {
  if (!winner || unlockAt <= 0n) {
    return null;
  }
  return unlockAt - BigInt(pool === "daily" ? 86_400 : 604_800);
}

function displayOptionalAddress(address: unknown) {
  if (!address) {
    return null;
  }
  const value = (address as { toString: (options: { bounceable: boolean; urlSafe: boolean }) => string }).toString({
    bounceable: false,
    urlSafe: true
  });
  return value.includes("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA") ? null : value;
}

function inferredCompletedPool(prize: bigint) {
  return prize > 0n ? (prize * 100n) / 80n : 0n;
}

function inferredProtocolFee(prize: bigint) {
  const pool = inferredCompletedPool(prize);
  return pool > prize ? pool - prize : 0n;
}

function formatIon(value: bigint | null | undefined) {
  if (value === null || value === undefined) {
    return "0 ION";
  }
  const sign = value < 0n ? "-" : "";
  const absolute = value < 0n ? -value : value;
  const whole = absolute / 1_000_000_000n;
  const fraction = (absolute % 1_000_000_000n).toString().padStart(9, "0").replace(/0+$/, "");
  return `${sign}${compact(whole)}${fraction ? `.${fraction}` : ""} ION`;
}

function compact(value: bigint) {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function shortAddress(address: string | null | undefined, emptyLabel: string) {
  if (!address) {
    return emptyLabel;
  }
  return `${address.slice(0, 7)}...${address.slice(-6)}`;
}

function formatUtc(timestamp: bigint) {
  return new Date(Number(timestamp) * 1000).toISOString().replace(".000Z", " UTC");
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected error.";
}
