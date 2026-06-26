"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  CircleDollarSign,
  Crown,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Ticket,
  Trophy,
  WalletCards,
  WalletMinimal
} from "lucide-react";
import { BrandLink, Footer, SideRail, type Locale } from "./navigation";

type PoolKey = "daily" | "weekly";
type AppMode = "user" | "admin";

type IonProvider = {
  isTonWallet?: boolean;
  send: (method: string, params?: unknown[]) => Promise<unknown>;
  on?: (method: "accountsChanged", listener: (accounts: string[]) => void) => void;
  removeListener?: (method: "accountsChanged", listener: (accounts: string[]) => void) => void;
};

type RuntimeKit = {
  Address: typeof import("@ton/core").Address;
  beginCell: typeof import("@ton/core").beginCell;
  toNano: typeof import("@ton/core").toNano;
  TonClient: typeof import("@ton/ton").TonClient;
  Lottery: typeof import("../build/Lottery/Lottery_Lottery").Lottery;
  storeSetDailyTicketPrice: typeof import("../build/Lottery/Lottery_Lottery").storeSetDailyTicketPrice;
  storeSetWeeklyTicketPrice: typeof import("../build/Lottery/Lottery_Lottery").storeSetWeeklyTicketPrice;
};

declare global {
  interface Window {
    ton?: IonProvider;
    tonwallet?: {
      provider?: IonProvider;
    };
    ion?: IonProvider;
    ionWallet?: IonProvider | { provider?: IonProvider };
    iceWallet?: IonProvider | { provider?: IonProvider };
  }
}

type PoolState = {
  key: PoolKey;
  title: string;
  ticketPrice: bigint;
  nextTicketPrice: bigint;
  round: bigint;
  drawUnlockAt: bigint;
  participantCount: bigint;
  pool: bigint;
  lastWinner: string | null;
  lastPrize: bigint;
  hasTicket: boolean | null;
};

type LotteryState = {
  owner: string;
  instantDraws: boolean;
  retainedFees: bigint;
  daily: PoolState;
  weekly: PoolState;
};

const DEFAULT_ENDPOINT =
  process.env.NEXT_PUBLIC_ION_ENDPOINT ?? "https://api.mainnet.ice.io/http/v2/jsonRPC";
const DEFAULT_CONTRACT = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "";
const CONTRACT_STORAGE_KEY = "ion-lottery.contract";
const ENDPOINT_STORAGE_KEY = "ion-lottery.endpoint";
const USER_REFRESH_INTERVAL_MS = 8000;
const ADMIN_REFRESH_INTERVAL_MS = 15000;

const userCopy = {
  en: {
    missingContract: "Lottery is not live yet.",
    runtimeLoading: "Wallet runtime is still loading.",
    updatingPools: "Updating pools.",
    poolsUpdated: "Pools updated.",
    walletUnavailable: "ION Wallet is installed but not available on this page. Allow site access for localhost in Chrome, then refresh.",
    unlockWallet: "Unlock ION Wallet and select an account.",
    walletConnected: "ION Wallet connected.",
    walletDisconnected: "ION Wallet disconnected locally.",
    connectWallet: "Connect ION Wallet",
    confirmTransaction: (label: string) => `Confirm ${label} in ION Wallet.`,
    transactionNotSent: (label: string) => `${label} was not sent.`,
    transactionSent: (label: string) => `${label} sent. Waiting for confirmation.`,
    dailyBuy: "Buy daily ticket",
    weeklyBuy: "Buy weekly ticket",
    eyebrow: "Daily and weekly ION pools",
    title: "Play the daily and weekly ION lottery.",
    dailyTicket: "Daily ticket",
    weeklyTicket: "Weekly ticket",
    wallet: "Wallet",
    notConnected: "Not connected",
    testMode: "Test mode",
    winnerPayout: "Winner payout",
    instantDraws: "Instant draws",
    lotteryMetrics: "Lottery metrics",
    lotteryPools: "Lottery pools",
    daily: "Daily",
    weekly: "Weekly",
    round: "Round",
    drawOpen: "Draw open",
    live: "Live",
    pool: "Pool",
    drawWindow: "Draw window",
    anytime: "Anytime",
    entries: "Entries",
    ticket: "Ticket",
    nextTicket: "Next ticket",
    lastPrize: "Last prize",
    lastWinner: "Last winner",
    confirming: "Confirming",
    entered: "Entered",
    buyTicket: "Buy ticket",
    draw: "Draw",
    waiting: "Waiting",
    loading: "Loading",
    none: "None",
    ready: "Ready",
    endsIn: "Ends in",
    drawsIn: "Draws in",
    day: "day",
    days: "days"
  },
  zh: {
    missingContract: "彩票尚未上线。",
    runtimeLoading: "钱包运行环境仍在加载。",
    updatingPools: "正在更新奖池。",
    poolsUpdated: "奖池已更新。",
    walletUnavailable: "已安装 ION Wallet，但当前页面无法访问。请在 Chrome 中允许 localhost 访问后刷新。",
    unlockWallet: "请解锁 ION Wallet 并选择账户。",
    walletConnected: "ION Wallet 已连接。",
    walletDisconnected: "ION Wallet 已在本地断开连接。",
    connectWallet: "连接 ION Wallet",
    confirmTransaction: (label: string) => `请在 ION Wallet 中确认${label}。`,
    transactionNotSent: (label: string) => `${label}未发送。`,
    transactionSent: (label: string) => `${label}已发送，等待确认。`,
    dailyBuy: "购买每日彩票",
    weeklyBuy: "购买每周彩票",
    eyebrow: "每日和每周 ION 奖池",
    title: "参与每日和每周 ION 彩票。",
    dailyTicket: "每日票价",
    weeklyTicket: "每周票价",
    wallet: "钱包",
    notConnected: "未连接",
    testMode: "测试模式",
    winnerPayout: "中奖分配",
    instantDraws: "即时开奖",
    lotteryMetrics: "彩票指标",
    lotteryPools: "彩票奖池",
    daily: "每日",
    weekly: "每周",
    round: "轮次",
    drawOpen: "可开奖",
    live: "开放中",
    pool: "奖池",
    drawWindow: "开奖窗口",
    anytime: "随时",
    entries: "参与人数",
    ticket: "票价",
    nextTicket: "下轮票价",
    lastPrize: "上次奖金",
    lastWinner: "上次赢家",
    confirming: "确认中",
    entered: "已参与",
    buyTicket: "购买彩票",
    draw: "开奖",
    waiting: "等待中",
    loading: "加载中",
    none: "无",
    ready: "已就绪",
    endsIn: "距离结束",
    drawsIn: "距离开奖",
    day: "天",
    days: "天"
  }
} satisfies Record<Locale, Record<string, string | ((label: string) => string)>>;

type UserCopy = typeof userCopy.en;

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
        beginCell: tonCore.beginCell,
        toNano: tonCore.toNano,
        TonClient: tonTon.TonClient,
        Lottery: lotteryModule.Lottery,
        storeSetDailyTicketPrice: lotteryModule.storeSetDailyTicketPrice,
        storeSetWeeklyTicketPrice: lotteryModule.storeSetWeeklyTicketPrice
      };
    })();
  }

  return runtimePromise;
}

export default function LotteryApp({ mode, locale = "en" }: { mode: AppMode; locale?: Locale }) {
  const [runtime, setRuntime] = useState<RuntimeKit | null>(null);
  const [ionProvider, setIonProvider] = useState<IonProvider | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [endpoint, setEndpoint] = useState(DEFAULT_ENDPOINT);
  const [contractAddressText, setContractAddressText] = useState(DEFAULT_CONTRACT);
  const [state, setState] = useState<LotteryState | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("Ready.");
  const [statusKind, setStatusKind] = useState<"idle" | "ok" | "error">("idle");
  const [dailyPriceInput, setDailyPriceInput] = useState("");
  const [weeklyPriceInput, setWeeklyPriceInput] = useState("");
  const [pendingBuyRounds, setPendingBuyRounds] = useState<Partial<Record<PoolKey, bigint>>>({});
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const loadingRef = useRef(false);
  const isAdmin = mode === "admin";
  const copy: UserCopy = isAdmin ? userCopy.en : userCopy[locale];

  const setStatus = useCallback((message: string, kind: "idle" | "ok" | "error" = "idle") => {
    setStatusText(message);
    setStatusKind(kind);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let provider: IonProvider | null = null;
    let accountsChanged: ((accounts: string[]) => void) | undefined;

    async function boot() {
      try {
        const kit = await loadRuntime();
        if (cancelled) {
          return;
        }

        if (isAdmin) {
          const storedEndpoint = localStorage.getItem(ENDPOINT_STORAGE_KEY);
          const storedContract = localStorage.getItem(CONTRACT_STORAGE_KEY);
          if (storedEndpoint) {
            setEndpoint(storedEndpoint);
          }
          if (storedContract) {
            setContractAddressText(storedContract);
          }
        } else {
          localStorage.removeItem(CONTRACT_STORAGE_KEY);
          localStorage.removeItem(ENDPOINT_STORAGE_KEY);
          setEndpoint(DEFAULT_ENDPOINT);
          setContractAddressText(DEFAULT_CONTRACT);
        }

        provider = await waitForIonProvider(2500);
        accountsChanged = (accounts: string[]) => {
          setWalletAddress(normalizeWalletAddress(kit, accounts[0]));
        };
        provider?.on?.("accountsChanged", accountsChanged);

        setRuntime(kit);
        setIonProvider(provider);

        if (provider) {
          const accounts = await requestIonAccounts(provider);
          if (!cancelled) {
            setWalletAddress(normalizeWalletAddress(kit, accounts[0]));
          }
        }
      } catch (error) {
        setStatus(errorMessage(error), "error");
      }
    }

    void boot();

    return () => {
      cancelled = true;
      if (provider && accountsChanged) {
        provider.removeListener?.("accountsChanged", accountsChanged);
      }
    };
  }, [isAdmin, setStatus]);

  useEffect(() => {
    if (ionProvider) {
      return;
    }

    const interval = window.setInterval(() => {
      const provider = getIonProvider();
      if (provider) {
        setIonProvider(provider);
        window.clearInterval(interval);
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [ionProvider]);

  const connectedAddress = useMemo(() => {
    if (!runtime || !walletAddress) {
      return null;
    }
    try {
      return displayAddress(runtime, walletAddress);
    } catch {
      return null;
    }
  }, [runtime, walletAddress]);

  const owner = !!connectedAddress && !!state && connectedAddress === state.owner;
  const showAdminGate = isAdmin && !owner;
  const missingContractMessage = isAdmin ? "Enter a contract address." : copy.missingContract;
  const showStatus = isAdmin || loading || statusKind !== "idle" || statusText !== "Ready.";

  const lotteryContract = useCallback(() => {
    if (!runtime) {
      throw new Error("Wallet runtime is still loading.");
    }

    return new runtime.TonClient({ endpoint }).open(
      runtime.Lottery.fromAddress(runtime.Address.parse(contractAddressText))
    );
  }, [contractAddressText, endpoint, runtime]);

  const loadState = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!runtime) {
      if (!silent) {
        setStatus(copy.runtimeLoading);
      }
      return;
    }
    if (!contractAddressText.trim()) {
      if (!silent) {
        setStatus(missingContractMessage, "error");
      }
      return;
    }
    if (loadingRef.current) {
      return;
    }

    loadingRef.current = true;
    if (!silent) {
      setLoading(true);
      setStatus(isAdmin ? "Refreshing lottery state." : copy.updatingPools);
    }

    try {
      const lottery = lotteryContract();
      const [
        contractOwner,
        instantDraws,
        retainedFees,
        dailyTicketPrice,
        nextDailyTicketPrice,
        dailyRound,
        dailyDrawUnlockAt,
        dailyParticipantCount,
        dailyPool,
        lastDailyWinner,
        lastDailyPrize,
        weeklyTicketPrice,
        nextWeeklyTicketPrice,
        weeklyRound,
        weeklyDrawUnlockAt,
        weeklyParticipantCount,
        weeklyPool,
        lastWeeklyWinner,
        lastWeeklyPrize
      ] = await Promise.all([
        lottery.getGetOwner(),
        getInstantDraws(lottery),
        lottery.getGetRetainedFees(),
        lottery.getGetDailyTicketPrice(),
        lottery.getGetNextDailyTicketPrice(),
        lottery.getGetDailyRound(),
        lottery.getGetDailyDrawUnlockAt(),
        lottery.getGetDailyParticipantCount(),
        lottery.getGetDailyPool(),
        lottery.getGetLastDailyWinner(),
        lottery.getGetLastDailyPrize(),
        lottery.getGetWeeklyTicketPrice(),
        lottery.getGetNextWeeklyTicketPrice(),
        lottery.getGetWeeklyRound(),
        lottery.getGetWeeklyDrawUnlockAt(),
        lottery.getGetWeeklyParticipantCount(),
        lottery.getGetWeeklyPool(),
        lottery.getGetLastWeeklyWinner(),
        lottery.getGetLastWeeklyPrize()
      ]);

      const walletAddress = connectedAddress ? runtime.Address.parse(connectedAddress) : null;
      const [dailyHasTicket, weeklyHasTicket] = walletAddress
        ? await Promise.all([
            lottery.getGetDailyHasTicket(walletAddress),
            lottery.getGetWeeklyHasTicket(walletAddress)
          ])
        : [null, null];

      setState({
        owner: displayAddress(runtime, contractOwner),
        instantDraws,
        retainedFees,
        daily: {
          key: "daily",
          title: "Daily",
          ticketPrice: dailyTicketPrice,
          nextTicketPrice: nextDailyTicketPrice,
          round: dailyRound,
          drawUnlockAt: dailyDrawUnlockAt,
          participantCount: dailyParticipantCount,
          pool: dailyPool,
          lastWinner: displayOptionalAddress(runtime, lastDailyWinner),
          lastPrize: lastDailyPrize,
          hasTicket: dailyHasTicket
        },
        weekly: {
          key: "weekly",
          title: "Weekly",
          ticketPrice: weeklyTicketPrice,
          nextTicketPrice: nextWeeklyTicketPrice,
          round: weeklyRound,
          drawUnlockAt: weeklyDrawUnlockAt,
          participantCount: weeklyParticipantCount,
          pool: weeklyPool,
          lastWinner: displayOptionalAddress(runtime, lastWeeklyWinner),
          lastPrize: lastWeeklyPrize,
          hasTicket: weeklyHasTicket
        }
      });

      if (isAdmin) {
        localStorage.setItem(CONTRACT_STORAGE_KEY, contractAddressText);
        localStorage.setItem(ENDPOINT_STORAGE_KEY, endpoint);
      }
      if (!silent) {
        setStatus(isAdmin ? "State refreshed." : copy.poolsUpdated, "ok");
      }
    } catch (error) {
      if (!silent) {
        setState(null);
        setStatus(errorMessage(error), "error");
      }
    } finally {
      loadingRef.current = false;
      if (!silent) {
        setLoading(false);
      }
    }
  }, [connectedAddress, contractAddressText, endpoint, isAdmin, lotteryContract, missingContractMessage, runtime, setStatus]);

  useEffect(() => {
    if (runtime && contractAddressText) {
      void loadState();
    }
  }, [connectedAddress, contractAddressText, endpoint, loadState, runtime]);

  useEffect(() => {
    if (!state) {
      return;
    }

    setPendingBuyRounds((current) => {
      const next = { ...current };
      let changed = false;

      for (const pool of [state.daily, state.weekly]) {
        const pendingRound = next[pool.key];
        if (pendingRound === undefined) {
          continue;
        }
        if (pool.hasTicket || pool.round > pendingRound) {
          delete next[pool.key];
          changed = true;
        }
      }

      return changed ? next : current;
    });
  }, [state]);

  useEffect(() => {
    if (!runtime || !contractAddressText.trim()) {
      return;
    }

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadState({ silent: true });
      }
    }, isAdmin ? ADMIN_REFRESH_INTERVAL_MS : USER_REFRESH_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [contractAddressText, isAdmin, loadState, runtime]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  async function connectIonWallet() {
    if (!runtime) {
      return null;
    }

    const provider = ionProvider ?? (await waitForIonProvider(8000));
    if (!provider) {
      setStatus(copy.walletUnavailable, "error");
      return null;
    }

    setIonProvider(provider);
    const accounts = await requestIonAccounts(provider);
    const address = normalizeWalletAddress(runtime, accounts[0]);
    if (!address) {
      setStatus(copy.unlockWallet, "error");
      return null;
    }

    setWalletAddress(address);
    setStatus(copy.walletConnected, "ok");
    return address;
  }

  async function connectOrDisconnect() {
    if (connectedAddress) {
      setWalletAddress(null);
      setPendingBuyRounds({});
      setStatus(copy.walletDisconnected);
      return;
    }

    await connectIonWallet();
  }

  async function sendTransaction(label: string, amount: bigint, body: string) {
    if (!runtime) {
      setStatus(copy.runtimeLoading);
      return false;
    }
    if (!contractAddressText.trim()) {
      setStatus(missingContractMessage, "error");
      return false;
    }
    let provider = ionProvider ?? getIonProvider();
    let address = connectedAddress;
    if (!provider || !address) {
      address = await connectIonWallet();
      provider = getIonProvider();
    }
    if (!provider || !address) {
      return false;
    }

    setStatus(copy.confirmTransaction(label));
    try {
      const sent = await provider.send("ton_sendTransaction", [{
        to: runtime.Address.parse(contractAddressText).toString({
          bounceable: true,
          urlSafe: true
        }),
        value: amount.toString(),
        data: body,
        dataType: "boc"
      }]);
      if (!sent) {
        setStatus(copy.transactionNotSent(label), "error");
        return false;
      }
      setStatus(copy.transactionSent(label), "ok");
      window.setTimeout(() => void loadState({ silent: true }), 5000);
      window.setTimeout(() => void loadState({ silent: true }), 15000);
      return true;
    } catch (error) {
      setStatus(errorMessage(error), "error");
      return false;
    }
  }

  function walletReady() {
    return !!connectedAddress;
  }

  function walletButtonLabel() {
    if (connectedAddress) {
      return shortAddress(connectedAddress);
    }
    return copy.connectWallet;
  }

  function heroWalletLabel() {
    if (connectedAddress) {
      return copy.walletConnected;
    }
    return copy.connectWallet;
  }

  function textBody(message: string) {
    if (!runtime) {
      throw new Error(copy.runtimeLoading);
    }
    return runtime.beginCell().storeUint(0, 32).storeStringTail(message).endCell().toBoc().toString("base64");
  }

  async function buyTicket(pool: PoolState) {
    const sent = await sendTransaction(
      pool.key === "daily" ? copy.dailyBuy : copy.weeklyBuy,
      pool.ticketPrice,
      textBody(pool.key === "daily" ? "BuyDailyTicket" : "BuyWeeklyTicket")
    );
    if (sent) {
      setPendingBuyRounds((current) => ({ ...current, [pool.key]: pool.round }));
    }
  }

  async function drawPool(pool: PoolState) {
    if (!runtime) {
      setStatus(copy.runtimeLoading);
      return;
    }
    await sendTransaction(
      pool.key === "daily" ? "DrawDaily" : "DrawWeekly",
      runtime.toNano("0.2"),
      textBody(pool.key === "daily" ? "DrawDaily" : "DrawWeekly")
    );
  }

  async function withdrawFees() {
    if (!runtime) {
      setStatus("Wallet runtime is still loading.");
      return;
    }
    await sendTransaction("WithdrawFees", runtime.toNano("0.1"), textBody("WithdrawFees"));
  }

  async function setPoolPrice(pool: PoolKey) {
    if (!runtime) {
      setStatus("Wallet runtime is still loading.");
      return;
    }

    const raw = pool === "daily" ? dailyPriceInput.trim() : weeklyPriceInput.trim();
    if (!raw) {
      setStatus("Enter a price.", "error");
      return;
    }

    try {
      const price = runtime.toNano(raw);
      const body =
        pool === "daily"
          ? runtime.beginCell().store(runtime.storeSetDailyTicketPrice({ $$type: "SetDailyTicketPrice", price })).endCell()
          : runtime.beginCell().store(runtime.storeSetWeeklyTicketPrice({ $$type: "SetWeeklyTicketPrice", price })).endCell();
      await sendTransaction(`Set ${pool} price`, runtime.toNano("0.05"), body.toBoc().toString("base64"));
    } catch (error) {
      setStatus(errorMessage(error), "error");
    }
  }

  return (
    <div className="app-shell">
      <SideRail active="pools" locale={isAdmin ? "en" : locale} />

      <main className="dashboard">
        <header className="topbar">
          <BrandLink locale={isAdmin ? "en" : locale} />
          <div className="topbar-actions">
            {isAdmin ? (
              <nav className="admin-switch" aria-label="Admin navigation">
                <Link className="nav-link" href="/">
                  Pools
                </Link>
                <Link className="nav-link active" href="/admin">
                  Admin
                </Link>
              </nav>
            ) : (
              <Link className="nav-link" href={locale === "zh" ? "/" : "/zh"}>
                {locale === "zh" ? "English" : "中文"}
              </Link>
            )}
            <button className="icon-button" type="button" title="Refresh" onClick={() => void loadState()}>
              <RefreshCw />
            </button>
            <button className="wallet-button" type="button" onClick={() => void connectOrDisconnect()}>
              <WalletMinimal />
              <span>{walletButtonLabel()}</span>
            </button>
          </div>
        </header>

        <div className="dashboard-content">
          {showAdminGate ? (
            <AdminAccessGate
              connectedAddress={connectedAddress}
              ownerAddress={state?.owner ?? null}
              loading={loading}
              statusText={statusText}
              statusKind={statusKind}
              onConnect={() => void connectOrDisconnect()}
              onRefresh={() => void loadState()}
            />
          ) : (
            <>
          <section className={`hero-band ${isAdmin ? "admin" : "user"}`}>
            <div className="eyebrow">
              <Sparkles /> {isAdmin ? "Lottery operations" : copy.eyebrow}
            </div>
            <h1>{isAdmin ? "Operate lottery pricing and retained fees." : copy.title}</h1>
            {isAdmin ? (
              <div className="contract-strip">
                <label>
                  Contract
                  <input
                    value={contractAddressText}
                    onChange={(event) => setContractAddressText(event.target.value)}
                    placeholder="EQ..."
                    autoComplete="off"
                  />
                </label>
                <label>
                  Endpoint
                  <input value={endpoint} onChange={(event) => setEndpoint(event.target.value)} autoComplete="off" />
                </label>
                <button className="primary-button" type="button" onClick={() => void loadState()}>
                  <RefreshCw />
                  <span>Load</span>
                </button>
              </div>
            ) : (
              <button className="primary-button hero-wallet" type="button" onClick={() => void connectOrDisconnect()}>
                <WalletMinimal />
                <span>{heroWalletLabel()}</span>
              </button>
            )}
            {showStatus ? (
              <div className={`status-line ${statusKind}`}>
                {loading ? <span className="spinner" /> : null}
                <span>{statusText}</span>
              </div>
            ) : null}
          </section>

          <section className="metrics-band" aria-label={isAdmin ? "Lottery metrics" : copy.lotteryMetrics}>
            {isAdmin ? (
              <>
                <Metric label="Owner" value={state ? shortAddress(state.owner) : "Not loaded"} icon={<ShieldCheck />} />
                <Metric label="Retained fees" value={state ? formatIon(state.retainedFees) : "0 ION"} icon={<CircleDollarSign />} />
                <Metric label="Wallet" value={connectedAddress ? shortAddress(connectedAddress) : "Not connected"} icon={<WalletCards />} />
                <Metric label="Access" value={owner ? "Owner" : "Customer"} icon={<Crown />} />
              </>
            ) : (
              <>
                <Metric label={copy.dailyTicket} value={state ? formatIon(state.daily.ticketPrice) : "1,000 ION"} icon={<Ticket />} />
                <Metric label={copy.weeklyTicket} value={state ? formatIon(state.weekly.ticketPrice) : "5,000 ION"} icon={<Trophy />} />
                <Metric label={copy.wallet} value={connectedAddress ? shortAddress(connectedAddress, copy.none) : copy.notConnected} icon={<WalletCards />} />
                <Metric label={state?.instantDraws ? copy.testMode : copy.winnerPayout} value={state?.instantDraws ? copy.instantDraws : "80%"} icon={<CircleDollarSign />} />
              </>
            )}
          </section>

          <section className="pool-grid" aria-label={isAdmin ? "Lottery pools" : copy.lotteryPools}>
            {state ? (
              <PoolCard
                pool={state.daily}
                now={now}
                instantDraws={state.instantDraws}
                walletReady={walletReady()}
                buyPending={pendingBuyRounds.daily !== undefined}
                copy={copy}
                onBuy={buyTicket}
                onDraw={isAdmin ? drawPool : undefined}
              />
            ) : (
              <PoolSkeleton title={copy.daily} copy={copy} />
            )}
            {state ? (
              <PoolCard
                pool={state.weekly}
                now={now}
                instantDraws={state.instantDraws}
                walletReady={walletReady()}
                buyPending={pendingBuyRounds.weekly !== undefined}
                copy={copy}
                onBuy={buyTicket}
                onDraw={isAdmin ? drawPool : undefined}
              />
            ) : (
              <PoolSkeleton title={copy.weekly} copy={copy} />
            )}
          </section>

          {isAdmin ? (
            <section className={`owner-band ${owner ? "" : "muted"}`}>
              <div className="section-heading">
                <div>
                  <span className="eyebrow">
                    <ShieldCheck /> Owner
                  </span>
                  <h2>Pricing and retained fees</h2>
                </div>
                <button
                  className="secondary-button"
                  type="button"
                  disabled={!owner || !state?.retainedFees}
                  onClick={() => void withdrawFees()}
                >
                  <WalletMinimal />
                  <span>Withdraw</span>
                </button>
              </div>
              <div className="owner-grid">
                <PriceControl
                  pool="daily"
                  label="Daily"
                  value={dailyPriceInput}
                  current={state?.daily.nextTicketPrice}
                  disabled={!owner}
                  onChange={setDailyPriceInput}
                  onSet={setPoolPrice}
                />
                <PriceControl
                  pool="weekly"
                  label="Weekly"
                  value={weeklyPriceInput}
                  current={state?.weekly.nextTicketPrice}
                  disabled={!owner}
                  onChange={setWeeklyPriceInput}
                  onSet={setPoolPrice}
                />
              </div>
            </section>
          ) : null}
            </>
          )}
        </div>

        <Footer locale={isAdmin ? "en" : locale} />
      </main>
    </div>
  );
}

function AdminAccessGate({
  connectedAddress,
  ownerAddress,
  loading,
  statusText,
  statusKind,
  onConnect,
  onRefresh
}: {
  connectedAddress: string | null;
  ownerAddress: string | null;
  loading: boolean;
  statusText: string;
  statusKind: "idle" | "ok" | "error";
  onConnect: () => void;
  onRefresh: () => void;
}) {
  const connectedWrongWallet = !!connectedAddress && !!ownerAddress && connectedAddress !== ownerAddress;

  return (
    <section className="access-gate" aria-label="Admin access restricted">
      <div className="access-icon">
        <ShieldCheck />
      </div>
      <span className="eyebrow">Owner only</span>
      <h1>Connect the owner wallet to access admin.</h1>
      <p>
        {connectedWrongWallet
          ? "The connected wallet does not own this lottery contract."
          : connectedAddress
            ? "Checking owner access for the connected wallet."
            : "Admin controls are hidden until the contract owner wallet is connected."}
      </p>
      <div className="access-actions">
        <button className="primary-button" type="button" onClick={onConnect}>
          <WalletMinimal />
          <span>{connectedAddress ? "Switch wallet" : "Connect ION Wallet"}</span>
        </button>
        <button className="secondary-button" type="button" onClick={onRefresh}>
          <RefreshCw />
          <span>Check access</span>
        </button>
      </div>
      <dl className="access-details">
        <div>
          <dt>Connected</dt>
          <dd>{connectedAddress ? shortAddress(connectedAddress) : "Not connected"}</dd>
        </div>
        <div>
          <dt>Owner</dt>
          <dd>{ownerAddress ? shortAddress(ownerAddress) : "Loading"}</dd>
        </div>
      </dl>
      {loading || statusKind !== "idle" || statusText !== "Ready." ? (
        <div className={`status-line ${statusKind}`}>
          {loading ? <span className="spinner" /> : null}
          <span>{statusText}</span>
        </div>
      ) : null}
    </section>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <article className="metric">
      <span className="metric-icon">{icon}</span>
      <span className="metric-copy">
        <span>{label}</span>
        <strong>{value}</strong>
      </span>
    </article>
  );
}

function PoolCard({
  pool,
  now,
  instantDraws,
  walletReady,
  buyPending,
  copy,
  onBuy,
  onDraw
}: {
  pool: PoolState;
  now: number;
  instantDraws: boolean;
  walletReady: boolean;
  buyPending: boolean;
  copy: UserCopy;
  onBuy: (pool: PoolState) => Promise<void>;
  onDraw?: (pool: PoolState) => Promise<void>;
}) {
  const ready = now >= Number(pool.drawUnlockAt);
  const entered = pool.hasTicket === true;
  const prize = splitIon(pool.pool);
  const hasPendingPrice = pool.nextTicketPrice !== pool.ticketPrice;

  return (
    <article className={`pool-card ${pool.key}`}>
      <div className="pool-glow" aria-hidden="true" />
      <div className="pool-top">
        <div className="pool-title">
          <span>{pool.key === "daily" ? copy.daily : copy.weekly}</span>
          <h2>{copy.round} #{pool.round.toString()}</h2>
        </div>
        <span className={`state-pill ${instantDraws ? "test" : ready ? "ready" : "live"}`}>
          <span />
          {instantDraws ? copy.testMode : ready ? copy.drawOpen : copy.live}
        </span>
      </div>
      <div className="pool-prize">
        <span>{copy.pool}</span>
        <strong>
          {prize.amount} <small>{prize.unit}</small>
        </strong>
      </div>
      <div className="countdown-box">
        <span>{instantDraws ? copy.drawWindow : countdownLabel(pool, now, copy)}</span>
        <strong>{instantDraws ? copy.anytime : countdownValue(pool, now, copy)}</strong>
      </div>
      <dl className="pool-facts" aria-label={`${pool.key === "daily" ? copy.daily : copy.weekly} ${copy.pool}`}>
        <div>
          <dt>{copy.entries}</dt>
          <dd>{pool.participantCount.toString()}</dd>
        </div>
        <div>
          <dt>{copy.ticket}</dt>
          <dd>{formatIon(pool.ticketPrice)}</dd>
        </div>
        {hasPendingPrice ? (
          <div>
            <dt>{copy.nextTicket}</dt>
            <dd>{formatIon(pool.nextTicketPrice)}</dd>
          </div>
        ) : null}
        <div>
          <dt>{copy.lastPrize}</dt>
          <dd>{formatIon(pool.lastPrize)}</dd>
        </div>
        <div>
          <dt>{copy.lastWinner}</dt>
          <dd>{shortAddress(pool.lastWinner, copy.none)}</dd>
        </div>
      </dl>
      <div className={`pool-actions ${onDraw ? "" : "single"}`}>
        <button className="primary-button" type="button" disabled={!walletReady || buyPending || entered || (ready && !instantDraws)} onClick={() => void onBuy(pool)}>
          {buyPending ? <span className="spinner button-spinner" /> : <Ticket />}
          <span>{buyPending ? copy.confirming : entered ? copy.entered : copy.buyTicket}</span>
        </button>
        {onDraw ? (
          <button className="secondary-button" type="button" disabled={!walletReady || !ready} onClick={() => void onDraw(pool)}>
            <Trophy />
            <span>{copy.draw}</span>
          </button>
        ) : null}
      </div>
    </article>
  );
}

function PoolSkeleton({ title, copy }: { title: string; copy: UserCopy }) {
  return (
    <article className="pool-card skeleton">
      <div className="pool-glow" aria-hidden="true" />
      <div className="pool-top">
        <div className="pool-title">
          <span>{title}</span>
          <h2>{copy.round}</h2>
        </div>
        <span className="state-pill">
          <span />
          {copy.waiting}
        </span>
      </div>
      <div className="pool-prize">
        <span>{copy.pool}</span>
        <strong>
          0 <small>ION</small>
        </strong>
      </div>
      <div className="countdown-box">
        <span>{copy.loading}</span>
        <strong>--:--:--</strong>
      </div>
      <dl className="pool-facts">
        <div>
          <dt>{copy.entries}</dt>
          <dd>0</dd>
        </div>
        <div>
          <dt>{copy.ticket}</dt>
          <dd>0 ION</dd>
        </div>
      </dl>
    </article>
  );
}

function PriceControl({
  pool,
  label,
  value,
  current,
  disabled,
  onChange,
  onSet
}: {
  pool: PoolKey;
  label: string;
  value: string;
  current: bigint | undefined;
  disabled: boolean;
  onChange: (value: string) => void;
  onSet: (pool: PoolKey) => Promise<void>;
}) {
  return (
    <div className="price-control">
      <label htmlFor={`${pool}-price-input`}>{label} next price</label>
      <div className="price-row">
        <input
          id={`${pool}-price-input`}
          inputMode="decimal"
          value={value}
          placeholder={current ? ionInputValue(current) : "0"}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
        <button className="secondary-button" type="button" disabled={disabled} onClick={() => void onSet(pool)}>
          <CircleDollarSign />
          <span>Set</span>
        </button>
      </div>
    </div>
  );
}

function getIonProvider() {
  if (typeof window === "undefined") {
    return null;
  }

  if (isIonProvider(window.ton)) {
    return window.ton;
  }

  if (isIonProvider(window.tonwallet?.provider)) {
    return window.tonwallet.provider;
  }

  if (isIonProvider(window.ion)) {
    return window.ion;
  }

  if (isIonProvider(window.ionWallet)) {
    return window.ionWallet;
  }

  if (isIonProvider(window.ionWallet?.provider)) {
    return window.ionWallet.provider;
  }

  if (isIonProvider(window.iceWallet)) {
    return window.iceWallet;
  }

  if (isIonProvider(window.iceWallet?.provider)) {
    return window.iceWallet.provider;
  }

  return null;
}

function isIonProvider(provider: unknown): provider is IonProvider {
  return !!provider && typeof provider === "object" && typeof (provider as IonProvider).send === "function";
}

function waitForIonProvider(timeoutMs = 1200) {
  const provider = getIonProvider();
  if (provider) {
    return Promise.resolve(provider);
  }

  return new Promise<IonProvider | null>((resolve) => {
    let settled = false;
    const finish = (nextProvider: IonProvider | null) => {
      if (settled) {
        return;
      }
      settled = true;
      window.removeEventListener("tonready", onReady);
      clearTimeout(timeout);
      resolve(nextProvider);
    };
    const onReady = () => finish(getIonProvider());
    const timeout = window.setTimeout(() => finish(getIonProvider()), timeoutMs);

    window.addEventListener("tonready", onReady, { once: true });
  });
}

async function getInstantDraws(lottery: { getGetInstantDraws?: () => Promise<boolean> }) {
  try {
    return (await lottery.getGetInstantDraws?.()) ?? false;
  } catch {
    return false;
  }
}

async function requestIonAccounts(provider: IonProvider) {
  const accounts = await provider.send("ton_requestAccounts", []);
  return Array.isArray(accounts) ? accounts.filter((account): account is string => typeof account === "string") : [];
}

function normalizeWalletAddress(runtime: RuntimeKit, address: string | null | undefined) {
  if (!address) {
    return null;
  }

  try {
    return displayAddress(runtime, address);
  } catch {
    return null;
  }
}

function displayAddress(runtime: RuntimeKit, address: unknown) {
  if (typeof address === "string") {
    return runtime.Address.parse(address).toString({ bounceable: false, urlSafe: true });
  }

  return (address as { toString: (options: { bounceable: boolean; urlSafe: boolean }) => string }).toString({
    bounceable: false,
    urlSafe: true
  });
}

function displayOptionalAddress(runtime: RuntimeKit, address: unknown) {
  if (!address) {
    return null;
  }
  const value = displayAddress(runtime, address);
  return value.includes("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA") ? null : value;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected error.";
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

function splitIon(value: bigint | null | undefined) {
  const formatted = formatIon(value);
  return {
    amount: formatted.replace(/ ION$/, ""),
    unit: "ION"
  };
}

function compact(value: bigint) {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function shortAddress(address: string | null | undefined, emptyLabel = "None") {
  if (!address) {
    return emptyLabel;
  }
  return `${address.slice(0, 7)}...${address.slice(-6)}`;
}

function unlockLabel(pool: PoolState) {
  return new Date(Number(pool.drawUnlockAt) * 1000).toISOString().replace(".000Z", " UTC");
}

function countdownLabel(pool: PoolState, now: number, copy: UserCopy) {
  if (now >= Number(pool.drawUnlockAt)) {
    return copy.ready;
  }

  return pool.key === "daily" ? copy.endsIn : copy.drawsIn;
}

function countdownValue(pool: PoolState, now: number, copy: UserCopy) {
  const seconds = Math.max(0, Number(pool.drawUnlockAt) - now);
  if (seconds === 0) {
    return copy.drawOpen;
  }

  const days = Math.floor(seconds / 86_400);
  if (days > 0) {
    return `${days} ${days === 1 ? copy.day : copy.days}`;
  }

  const hours = Math.floor(seconds / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const remainingSeconds = seconds % 60;

  return [hours, minutes, remainingSeconds].map((part) => part.toString().padStart(2, "0")).join(":");
}

function ionInputValue(value: bigint) {
  const whole = value / 1_000_000_000n;
  const fraction = (value % 1_000_000_000n).toString().padStart(9, "0").replace(/0+$/, "");
  return `${whole.toString()}${fraction ? `.${fraction}` : ""}`;
}
