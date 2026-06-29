"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CircleDollarSign, Crown, ExternalLink, RefreshCw, Trophy } from "lucide-react";

import type { Locale } from "./navigation";

type PoolKey = "daily" | "weekly";

type RuntimeKit = {
  Address: typeof import("@ton/core").Address;
  TonClient: typeof import("@ton/ton").TonClient;
  Lottery: typeof import("../build/Lottery/Lottery_Lottery").Lottery;
};

type WinnerEntry = {
  key: PoolKey;
  poolLabel: string;
  address: string | null;
  prize: bigint;
  completedRound: bigint | null;
  cutoffAt: bigint | null;
};

const DEFAULT_ENDPOINT =
  process.env.NEXT_PUBLIC_ION_ENDPOINT ?? "https://api.mainnet.ice.io/http/v2/jsonRPC";
const DEFAULT_CONTRACT = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "";
const EXPLORER_BASE = "https://explorer.ice.io/address";
const REFRESH_INTERVAL_MS = 30000;

const winnersCopy = {
  en: {
    leaderboard: "Leaderboard",
    introTitle: "Latest recorded lottery winners.",
    introBody:
      "The contract keeps the most recent winner for each pool. This page reads those records directly from the deployed lottery contract.",
    latestWinner: "Latest winner",
    winnerPayout: "Winner payout",
    noWinner: "None yet",
    daily: "Daily",
    weekly: "Weekly",
    round: "Round",
    cutoff: "Cutoff",
    prize: "Prize",
    wallet: "Wallet",
    viewWallet: "View wallet",
    refresh: "Refresh",
    loading: "Loading winners.",
    loaded: "Winners updated.",
    missingContract: "Lottery contract address is not configured.",
    unavailable: "Unavailable"
  },
  zh: {
    leaderboard: "排行榜",
    introTitle: "最新链上中奖记录。",
    introBody: "合约会保留每个奖池最近一次的中奖者。本页直接从已部署的彩票合约读取这些记录。",
    latestWinner: "最新获奖者",
    winnerPayout: "中奖分配",
    noWinner: "暂无",
    daily: "每日",
    weekly: "每周",
    round: "轮次",
    cutoff: "截止时间",
    prize: "奖金",
    wallet: "钱包",
    viewWallet: "查看钱包",
    refresh: "刷新",
    loading: "正在加载中奖者。",
    loaded: "中奖者已更新。",
    missingContract: "未配置彩票合约地址。",
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

export function WinnersPanel({ locale = "en" }: { locale?: Locale }) {
  const copy = winnersCopy[locale];
  const [runtime, setRuntime] = useState<RuntimeKit | null>(null);
  const [entries, setEntries] = useState<WinnerEntry[]>([]);
  const [statusText, setStatusText] = useState(copy.loading);
  const [statusKind, setStatusKind] = useState<"idle" | "ok" | "error">("idle");
  const [loading, setLoading] = useState(true);

  const contractAddress = DEFAULT_CONTRACT.trim();
  const latestWinner = useMemo(() => latestEntry(entries), [entries]);

  const loadWinners = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
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
        lastDailyWinner,
        lastDailyPrize,
        weeklyRound,
        weeklyDrawUnlockAt,
        lastWeeklyWinner,
        lastWeeklyPrize
      ] = await Promise.all([
        lottery.getGetDailyRound(),
        lottery.getGetDailyDrawUnlockAt(),
        lottery.getGetLastDailyWinner(),
        lottery.getGetLastDailyPrize(),
        lottery.getGetWeeklyRound(),
        lottery.getGetWeeklyDrawUnlockAt(),
        lottery.getGetLastWeeklyWinner(),
        lottery.getGetLastWeeklyPrize()
      ]);

      setEntries([
        {
          key: "daily",
          poolLabel: copy.daily,
          address: displayOptionalAddress(lastDailyWinner),
          prize: lastDailyPrize,
          completedRound: completedRound(dailyRound, lastDailyWinner),
          cutoffAt: previousCutoff("daily", dailyDrawUnlockAt, lastDailyWinner)
        },
        {
          key: "weekly",
          poolLabel: copy.weekly,
          address: displayOptionalAddress(lastWeeklyWinner),
          prize: lastWeeklyPrize,
          completedRound: completedRound(weeklyRound, lastWeeklyWinner),
          cutoffAt: previousCutoff("weekly", weeklyDrawUnlockAt, lastWeeklyWinner)
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
    void loadWinners();
  }, [loadWinners]);

  useEffect(() => {
    const interval = window.setInterval(() => void loadWinners({ silent: true }), REFRESH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [loadWinners]);

  return (
    <section className="info-grid winners-grid">
      <article className="info-card wide winners-summary">
        <div>
          <span className="info-label">{copy.leaderboard}</span>
          <h2>{copy.introTitle}</h2>
          <p>{copy.introBody}</p>
        </div>
        <button className="secondary-button compact-button" type="button" disabled={loading} onClick={() => void loadWinners()}>
          {loading ? <span className="spinner button-spinner" /> : <RefreshCw />}
          <span>{copy.refresh}</span>
        </button>
        <div className={`status-line ${statusKind}`}>
          {loading ? <span className="spinner" /> : null}
          <span>{statusText}</span>
        </div>
      </article>
      <article className="info-card">
        <span className="info-icon">
          <Crown />
        </span>
        <span className="info-label">{copy.latestWinner}</span>
        <strong>{shortAddress(latestWinner?.address, copy.noWinner)}</strong>
      </article>
      <article className="info-card">
        <span className="info-icon">
          <CircleDollarSign />
        </span>
        <span className="info-label">{copy.winnerPayout}</span>
        <strong>80%</strong>
      </article>
      {entries.map((entry) => (
        <article className="info-card winner-card" key={entry.key}>
          <div className="winner-card-top">
            <span className={`winner-pool ${entry.key}`}>{entry.poolLabel}</span>
            <Trophy />
          </div>
          <dl className="winner-details">
            <div>
              <dt>{copy.wallet}</dt>
              <dd>{shortAddress(entry.address, copy.noWinner)}</dd>
            </div>
            <div>
              <dt>{copy.prize}</dt>
              <dd>{formatIon(entry.prize)}</dd>
            </div>
            <div>
              <dt>{copy.round}</dt>
              <dd>{entry.completedRound ? `#${entry.completedRound.toString()}` : copy.unavailable}</dd>
            </div>
            <div>
              <dt>{copy.cutoff}</dt>
              <dd>{entry.cutoffAt ? formatUtc(entry.cutoffAt) : copy.unavailable}</dd>
            </div>
          </dl>
          {entry.address ? (
            <a className="winner-link" href={`${EXPLORER_BASE}/${entry.address}`} target="_blank" rel="noreferrer">
              <span>{copy.viewWallet}</span>
              <ExternalLink />
            </a>
          ) : null}
        </article>
      ))}
    </section>
  );
}

function latestEntry(entries: WinnerEntry[]) {
  return entries
    .filter((entry) => entry.address)
    .sort((left, right) => Number((right.cutoffAt ?? 0n) - (left.cutoffAt ?? 0n)))[0];
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
