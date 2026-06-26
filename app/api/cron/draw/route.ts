import { NextRequest, NextResponse } from "next/server";
import { Address, toNano } from "@ton/core";
import { TonClient } from "@ton/ton";

import { Lottery } from "../../../../build/Lottery/Lottery_Lottery";
import { loadWallet, sendInternalBatch, textBody } from "../../../../scripts/lottery-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DrawPlan = {
  pool: "daily" | "weekly";
  participants: string;
  unlockAt: string;
  reason: string;
};

type CronMessagePlan =
  | DrawPlan
  | {
      pool: "fees";
      retainedFees: string;
      reason: string;
    };

export async function GET(request: NextRequest) {
  const unauthorized = authorizeCronRequest(request);
  if (unauthorized) {
    return unauthorized;
  }

  const endpoint = process.env.ION_ENDPOINT ?? process.env.NEXT_PUBLIC_ION_ENDPOINT ?? "https://api.mainnet.ice.io/http/v2/jsonRPC";
  const contractAddress = process.env.CONTRACT_ADDRESS ?? process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  const keeperMnemonic = process.env.DRAW_KEEPER_MNEMONIC?.trim();

  if (!contractAddress) {
    return NextResponse.json({ ok: false, error: "Missing CONTRACT_ADDRESS or NEXT_PUBLIC_CONTRACT_ADDRESS." }, { status: 500 });
  }
  if (!keeperMnemonic) {
    return NextResponse.json({ ok: false, error: "Missing DRAW_KEEPER_MNEMONIC." }, { status: 500 });
  }

  try {
    const address = Address.parse(contractAddress);
    const client = new TonClient({ endpoint });
    const lottery = client.open(Lottery.fromAddress(address));
    const now = Math.floor(Date.now() / 1000);
    const drawValue = parseDrawValue();

    const [
      instantDraws,
      retainedFees,
      dailyUnlockAt,
      dailyParticipantCount,
      weeklyUnlockAt,
      weeklyParticipantCount
    ] = await Promise.all([
      getInstantDraws(lottery),
      lottery.getGetRetainedFees(),
      lottery.getGetDailyDrawUnlockAt(),
      lottery.getGetDailyParticipantCount(),
      lottery.getGetWeeklyDrawUnlockAt(),
      lottery.getGetWeeklyParticipantCount()
    ]);

    const plans: CronMessagePlan[] = [];
    if (shouldDraw({ instantDraws, now, unlockAt: dailyUnlockAt, participantCount: dailyParticipantCount })) {
      plans.push({
        pool: "daily",
        participants: dailyParticipantCount.toString(),
        unlockAt: new Date(Number(dailyUnlockAt) * 1000).toISOString(),
        reason: instantDraws ? "instant pool has participants" : "daily cutoff reached"
      });
    }
    if (shouldDraw({ instantDraws, now, unlockAt: weeklyUnlockAt, participantCount: weeklyParticipantCount })) {
      plans.push({
        pool: "weekly",
        participants: weeklyParticipantCount.toString(),
        unlockAt: new Date(Number(weeklyUnlockAt) * 1000).toISOString(),
        reason: instantDraws ? "instant pool has participants" : "weekly cutoff reached"
      });
    }
    if (retainedFees > 0n) {
      plans.push({
        pool: "fees",
        retainedFees: retainedFees.toString(),
        reason: "retained fees available"
      });
    }

    if (plans.length === 0) {
      return NextResponse.json({
        ok: true,
        action: "skipped",
        contract: address.toString({ bounceable: false, urlSafe: true }),
        instantDraws,
        retainedFees: retainedFees.toString(),
        now: new Date(now * 1000).toISOString(),
        pools: {
          daily: {
            participants: dailyParticipantCount.toString(),
            unlockAt: new Date(Number(dailyUnlockAt) * 1000).toISOString()
          },
          weekly: {
            participants: weeklyParticipantCount.toString(),
            unlockAt: new Date(Number(weeklyUnlockAt) * 1000).toISOString()
          }
        }
      });
    }

    const keeper = await loadWallet(keeperMnemonic, "DRAW_KEEPER_MNEMONIC");
    const seqno = await sendInternalBatch({
      walletContext: keeper,
      messages: plans.map((plan) => ({
        to: address,
        value: drawValue,
        body: textBody(messageForPlan(plan))
      }))
    });

    return NextResponse.json({
      ok: true,
      action: "sent",
      seqno,
      keeper: keeper.wallet.address.toString({ bounceable: false, urlSafe: true }),
      contract: address.toString({ bounceable: false, urlSafe: true }),
      instantDraws,
      operations: plans
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: errorMessage(error) }, { status: 500 });
  }
}

function messageForPlan(plan: CronMessagePlan) {
  if (plan.pool === "daily") {
    return "DrawDaily";
  }
  if (plan.pool === "weekly") {
    return "DrawWeekly";
  }
  return "WithdrawFees";
}

function authorizeCronRequest(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "Missing CRON_SECRET." }, { status: 500 });
  }

  const authorization = request.headers.get("authorization");
  if (authorization === `Bearer ${secret}`) {
    return null;
  }

  return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
}

function shouldDraw({
  instantDraws,
  now,
  unlockAt,
  participantCount
}: {
  instantDraws: boolean;
  now: number;
  unlockAt: bigint;
  participantCount: bigint;
}) {
  if (instantDraws) {
    return participantCount > 0n;
  }

  return now >= Number(unlockAt);
}

async function getInstantDraws(lottery: { getGetInstantDraws?: () => Promise<boolean> }) {
  try {
    return (await lottery.getGetInstantDraws?.()) ?? false;
  } catch {
    return false;
  }
}

function parseDrawValue() {
  const value = process.env.DRAW_VALUE ?? "0.2";
  return toNano(value);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error.";
}
