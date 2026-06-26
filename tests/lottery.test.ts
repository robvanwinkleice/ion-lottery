import { Blockchain, SandboxContract, TreasuryContract } from "@ton/sandbox";
import { toNano } from "@ton/core";
import { findTransactionRequired } from "@ton/test-utils";
import { beforeEach, describe, expect, it } from "vitest";

import { Lottery } from "../build/Lottery/Lottery_Lottery.js";

const DAILY_PRICE = toNano("10000");
const WEEKLY_PRICE = toNano("50000");
const DAY_SECONDS = 86_400;
const WEEK_SECONDS = 604_800;
const START_TIME = 1_767_225_600; // 2026-01-01T00:00:00Z, Thursday

function nextDailyUnlock(ts: number): number {
  return (Math.floor(ts / DAY_SECONDS) + 1) * DAY_SECONDS;
}

function nextWeeklyUnlock(ts: number): number {
  const day = Math.floor(ts / DAY_SECONDS);
  const weekday = (day + 3) % 7;
  const daysUntilMonday = 7 - weekday;
  return (day + daysUntilMonday) * DAY_SECONDS;
}

describe("Lottery", () => {
  let blockchain: Blockchain;
  let deployer: SandboxContract<TreasuryContract>;
  let alice: SandboxContract<TreasuryContract>;
  let bob: SandboxContract<TreasuryContract>;
  let drawCaller: SandboxContract<TreasuryContract>;
  let lottery: SandboxContract<Lottery>;

  beforeEach(async () => {
    blockchain = await Blockchain.create();
    blockchain.now = START_TIME;

    deployer = await blockchain.treasury("deployer");
    alice = await blockchain.treasury("alice");
    bob = await blockchain.treasury("bob");
    drawCaller = await blockchain.treasury("drawCaller");

    lottery = blockchain.openContract(await Lottery.fromInit(deployer.address, false));

    const result = await lottery.send(
      deployer.getSender(),
      { value: toNano("1") },
      "Deploy"
    );

    findTransactionRequired(result.transactions, {
      from: deployer.address,
      to: lottery.address,
      deploy: true,
      success: true
    });
  });

  it("initializes owner, prices, cutoffs, and empty pools", async () => {
    expect((await lottery.getGetOwner()).equals(deployer.address)).toBe(true);
    expect(await lottery.getGetInstantDraws()).toBe(false);
    expect(await lottery.getGetDailyTicketPrice()).toBe(DAILY_PRICE);
    expect(await lottery.getGetNextDailyTicketPrice()).toBe(DAILY_PRICE);
    expect(await lottery.getGetWeeklyTicketPrice()).toBe(WEEKLY_PRICE);
    expect(await lottery.getGetNextWeeklyTicketPrice()).toBe(WEEKLY_PRICE);
    expect(await lottery.getGetDailyRound()).toBe(1n);
    expect(await lottery.getGetWeeklyRound()).toBe(1n);
    expect(await lottery.getGetDailyDrawUnlockAt()).toBe(BigInt(nextDailyUnlock(START_TIME)));
    expect(await lottery.getGetWeeklyDrawUnlockAt()).toBe(BigInt(nextWeeklyUnlock(START_TIME)));
    expect(await lottery.getGetDailyParticipantCount()).toBe(0n);
    expect(await lottery.getGetWeeklyParticipantCount()).toBe(0n);
    expect(await lottery.getGetDailyPool()).toBe(0n);
    expect(await lottery.getGetWeeklyPool()).toBe(0n);
    expect(await lottery.getGetRetainedFees()).toBe(0n);
  });

  it("accepts exact daily and weekly tickets independently", async () => {
    await lottery.send(alice.getSender(), { value: DAILY_PRICE }, "BuyDailyTicket");
    await lottery.send(alice.getSender(), { value: WEEKLY_PRICE }, "BuyWeeklyTicket");

    expect(await lottery.getGetDailyParticipantCount()).toBe(1n);
    expect(await lottery.getGetWeeklyParticipantCount()).toBe(1n);
    expect(await lottery.getGetDailyPool()).toBe(DAILY_PRICE);
    expect(await lottery.getGetWeeklyPool()).toBe(WEEKLY_PRICE);
    expect(await lottery.getGetDailyHasTicket(alice.address)).toBe(true);
    expect(await lottery.getGetWeeklyHasTicket(alice.address)).toBe(true);
    expect((await lottery.getGetDailyParticipant(0n))?.equals(alice.address)).toBe(true);
    expect((await lottery.getGetWeeklyParticipant(0n))?.equals(alice.address)).toBe(true);
  });

  it("rejects wrong payment, duplicate entries, and late daily purchases", async () => {
    const wrongPayment = await lottery.send(
      alice.getSender(),
      { value: DAILY_PRICE - 1n },
      "BuyDailyTicket"
    );
    findTransactionRequired(wrongPayment.transactions, {
      from: alice.address,
      to: lottery.address,
      success: false
    });

    const overPayment = await lottery.send(
      alice.getSender(),
      { value: DAILY_PRICE + 1n },
      "BuyDailyTicket"
    );
    findTransactionRequired(overPayment.transactions, {
      from: alice.address,
      to: lottery.address,
      success: false
    });

    await lottery.send(alice.getSender(), { value: DAILY_PRICE }, "BuyDailyTicket");
    const duplicate = await lottery.send(
      alice.getSender(),
      { value: DAILY_PRICE },
      "BuyDailyTicket"
    );
    findTransactionRequired(duplicate.transactions, {
      from: alice.address,
      to: lottery.address,
      success: false
    });

    blockchain.now = nextDailyUnlock(START_TIME);
    const late = await lottery.send(bob.getSender(), { value: DAILY_PRICE }, "BuyDailyTicket");
    findTransactionRequired(late.transactions, {
      from: bob.address,
      to: lottery.address,
      success: false
    });
  });

  it("rejects wrong payment, duplicate entries, and late weekly purchases", async () => {
    const wrongPayment = await lottery.send(
      alice.getSender(),
      { value: WEEKLY_PRICE - 1n },
      "BuyWeeklyTicket"
    );
    findTransactionRequired(wrongPayment.transactions, {
      from: alice.address,
      to: lottery.address,
      success: false
    });

    await lottery.send(alice.getSender(), { value: WEEKLY_PRICE }, "BuyWeeklyTicket");

    const duplicate = await lottery.send(
      alice.getSender(),
      { value: WEEKLY_PRICE },
      "BuyWeeklyTicket"
    );
    findTransactionRequired(duplicate.transactions, {
      from: alice.address,
      to: lottery.address,
      success: false
    });

    blockchain.now = nextWeeklyUnlock(START_TIME);
    const late = await lottery.send(bob.getSender(), { value: WEEKLY_PRICE }, "BuyWeeklyTicket");
    findTransactionRequired(late.transactions, {
      from: bob.address,
      to: lottery.address,
      success: false
    });
  });

  it("lets only the owner set pending prices and applies each price after that pool draws", async () => {
    const nonOwner = await lottery.send(
      alice.getSender(),
      { value: toNano("0.05") },
      { $$type: "SetDailyTicketPrice", price: toNano("12000") }
    );
    findTransactionRequired(nonOwner.transactions, {
      from: alice.address,
      to: lottery.address,
      success: false
    });

    await lottery.send(
      deployer.getSender(),
      { value: toNano("0.05") },
      { $$type: "SetDailyTicketPrice", price: toNano("12000") }
    );
    await lottery.send(
      deployer.getSender(),
      { value: toNano("0.05") },
      { $$type: "SetWeeklyTicketPrice", price: toNano("150000") }
    );

    expect(await lottery.getGetDailyTicketPrice()).toBe(DAILY_PRICE);
    expect(await lottery.getGetNextDailyTicketPrice()).toBe(toNano("12000"));
    expect(await lottery.getGetWeeklyTicketPrice()).toBe(WEEKLY_PRICE);
    expect(await lottery.getGetNextWeeklyTicketPrice()).toBe(toNano("150000"));

    blockchain.now = nextDailyUnlock(START_TIME);
    await lottery.send(drawCaller.getSender(), { value: toNano("0.2") }, "DrawDaily");

    expect(await lottery.getGetDailyTicketPrice()).toBe(toNano("12000"));
    expect(await lottery.getGetWeeklyTicketPrice()).toBe(WEEKLY_PRICE);

    blockchain.now = nextWeeklyUnlock(START_TIME);
    await lottery.send(drawCaller.getSender(), { value: toNano("0.2") }, "DrawWeekly");

    expect(await lottery.getGetWeeklyTicketPrice()).toBe(toNano("150000"));
  });

  it("rejects zero next prices and empty fee withdrawals", async () => {
    const zeroDaily = await lottery.send(
      deployer.getSender(),
      { value: toNano("0.05") },
      { $$type: "SetDailyTicketPrice", price: 0n }
    );
    findTransactionRequired(zeroDaily.transactions, {
      from: deployer.address,
      to: lottery.address,
      success: false
    });

    const zeroWeekly = await lottery.send(
      deployer.getSender(),
      { value: toNano("0.05") },
      { $$type: "SetWeeklyTicketPrice", price: 0n }
    );
    findTransactionRequired(zeroWeekly.transactions, {
      from: deployer.address,
      to: lottery.address,
      success: false
    });

    const emptyWithdraw = await lottery.send(
      deployer.getSender(),
      { value: toNano("0.1") },
      "WithdrawFees"
    );
    findTransactionRequired(emptyWithdraw.transactions, {
      from: deployer.address,
      to: lottery.address,
      success: false
    });
  });

  it("allows permissionless daily draws after midnight UTC and pays 80 percent", async () => {
    await lottery.send(alice.getSender(), { value: DAILY_PRICE }, "BuyDailyTicket");
    await lottery.send(bob.getSender(), { value: DAILY_PRICE }, "BuyDailyTicket");

    const early = await lottery.send(
      drawCaller.getSender(),
      { value: toNano("0.2") },
      "DrawDaily"
    );
    findTransactionRequired(early.transactions, {
      from: drawCaller.address,
      to: lottery.address,
      success: false
    });

    blockchain.now = nextDailyUnlock(START_TIME);
    const result = await lottery.send(
      drawCaller.getSender(),
      { value: toNano("0.2") },
      "DrawDaily"
    );

    const prize = (DAILY_PRICE * 2n * 80n) / 100n;
    const fee = DAILY_PRICE * 2n - prize;
    const winner = await lottery.getGetLastDailyWinner();
    expect(winner).not.toBeNull();

    findTransactionRequired(result.transactions, {
      from: lottery.address,
      to: winner!,
      value: prize,
      success: true
    });

    expect(await lottery.getGetLastDailyPrize()).toBe(prize);
    expect(await lottery.getGetRetainedFees()).toBe(fee);
    expect(await lottery.getGetDailyRound()).toBe(2n);
    expect(await lottery.getGetDailyParticipantCount()).toBe(0n);
    expect(await lottery.getGetDailyPool()).toBe(0n);
    expect(await lottery.getGetDailyHasTicket(alice.address)).toBe(false);
    expect(await lottery.getGetDailyDrawUnlockAt()).toBe(
      BigInt(nextDailyUnlock(nextDailyUnlock(START_TIME)))
    );

    await lottery.send(alice.getSender(), { value: DAILY_PRICE }, "BuyDailyTicket");
    expect(await lottery.getGetDailyHasTicket(alice.address)).toBe(true);
    expect(await lottery.getGetDailyParticipantCount()).toBe(1n);
  });

  it("allows permissionless weekly draws after Monday midnight UTC and accumulates shared fees", async () => {
    await lottery.send(alice.getSender(), { value: DAILY_PRICE }, "BuyDailyTicket");
    blockchain.now = nextDailyUnlock(START_TIME);
    await lottery.send(drawCaller.getSender(), { value: toNano("0.2") }, "DrawDaily");

    await lottery.send(alice.getSender(), { value: WEEKLY_PRICE }, "BuyWeeklyTicket");
    await lottery.send(bob.getSender(), { value: WEEKLY_PRICE }, "BuyWeeklyTicket");

    const early = await lottery.send(
      drawCaller.getSender(),
      { value: toNano("0.2") },
      "DrawWeekly"
    );
    findTransactionRequired(early.transactions, {
      from: drawCaller.address,
      to: lottery.address,
      success: false
    });

    blockchain.now = nextWeeklyUnlock(START_TIME);
    const result = await lottery.send(
      drawCaller.getSender(),
      { value: toNano("0.2") },
      "DrawWeekly"
    );

    const weeklyPrize = (WEEKLY_PRICE * 2n * 80n) / 100n;
    const weeklyFee = WEEKLY_PRICE * 2n - weeklyPrize;
    const dailyFee = DAILY_PRICE - (DAILY_PRICE * 80n) / 100n;
    const winner = await lottery.getGetLastWeeklyWinner();
    expect(winner).not.toBeNull();

    findTransactionRequired(result.transactions, {
      from: lottery.address,
      to: winner!,
      value: weeklyPrize,
      success: true
    });

    expect(await lottery.getGetLastWeeklyPrize()).toBe(weeklyPrize);
    expect(await lottery.getGetRetainedFees()).toBe(dailyFee + weeklyFee);
    expect(await lottery.getGetWeeklyRound()).toBe(2n);
    expect(await lottery.getGetWeeklyParticipantCount()).toBe(0n);
    expect(await lottery.getGetWeeklyPool()).toBe(0n);
    expect(await lottery.getGetWeeklyDrawUnlockAt()).toBe(
      BigInt(nextWeeklyUnlock(nextWeeklyUnlock(START_TIME)))
    );
  });

  it("advances empty expired rounds without payout", async () => {
    blockchain.now = nextDailyUnlock(START_TIME);
    const daily = await lottery.send(drawCaller.getSender(), { value: toNano("0.2") }, "DrawDaily");
    findTransactionRequired(daily.transactions, {
      from: drawCaller.address,
      to: lottery.address,
      success: true
    });
    expect(await lottery.getGetLastDailyWinner()).toBeNull();
    expect(await lottery.getGetLastDailyPrize()).toBe(0n);
    expect(await lottery.getGetDailyRound()).toBe(2n);

    blockchain.now = nextWeeklyUnlock(START_TIME);
    const weekly = await lottery.send(drawCaller.getSender(), { value: toNano("0.2") }, "DrawWeekly");
    findTransactionRequired(weekly.transactions, {
      from: drawCaller.address,
      to: lottery.address,
      success: true
    });
    expect(await lottery.getGetLastWeeklyWinner()).toBeNull();
    expect(await lottery.getGetLastWeeklyPrize()).toBe(0n);
    expect(await lottery.getGetWeeklyRound()).toBe(2n);
  });

  it("can deploy an instant-draw testing contract", async () => {
    const instantLottery = blockchain.openContract(await Lottery.fromInit(deployer.address, true));

    const deploy = await instantLottery.send(
      deployer.getSender(),
      { value: toNano("1") },
      "Deploy"
    );
    findTransactionRequired(deploy.transactions, {
      from: deployer.address,
      to: instantLottery.address,
      deploy: true,
      success: true
    });

    expect(await instantLottery.getGetInstantDraws()).toBe(true);
    expect(await instantLottery.getGetDailyDrawUnlockAt()).toBe(BigInt(START_TIME));
    expect(await instantLottery.getGetWeeklyDrawUnlockAt()).toBe(BigInt(START_TIME));

    await instantLottery.send(alice.getSender(), { value: DAILY_PRICE }, "BuyDailyTicket");
    const result = await instantLottery.send(
      drawCaller.getSender(),
      { value: toNano("0.2") },
      "DrawDaily"
    );

    const prize = (DAILY_PRICE * 80n) / 100n;
    const winner = await instantLottery.getGetLastDailyWinner();
    expect(winner).not.toBeNull();

    findTransactionRequired(result.transactions, {
      from: instantLottery.address,
      to: winner!,
      value: prize,
      success: true
    });

    expect(await instantLottery.getGetDailyRound()).toBe(2n);
    expect(await instantLottery.getGetDailyPool()).toBe(0n);
    expect(await instantLottery.getGetDailyDrawUnlockAt()).toBe(BigInt(START_TIME));

    await instantLottery.send(alice.getSender(), { value: DAILY_PRICE }, "BuyDailyTicket");
    expect(await instantLottery.getGetDailyParticipantCount()).toBe(1n);
  });

  it("allows anyone to trigger retained fee withdrawal to the owner", async () => {
    await lottery.send(alice.getSender(), { value: DAILY_PRICE }, "BuyDailyTicket");
    blockchain.now = nextDailyUnlock(START_TIME);
    await lottery.send(drawCaller.getSender(), { value: toNano("0.2") }, "DrawDaily");

    const fee = DAILY_PRICE - (DAILY_PRICE * 80n) / 100n;
    expect(await lottery.getGetRetainedFees()).toBe(fee);

    const result = await lottery.send(
      alice.getSender(),
      { value: toNano("0.1") },
      "WithdrawFees"
    );
    findTransactionRequired(result.transactions, {
      from: lottery.address,
      to: deployer.address,
      value: fee,
      success: true
    });
    expect(await lottery.getGetRetainedFees()).toBe(0n);
  });
});
