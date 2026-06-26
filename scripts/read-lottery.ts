import "dotenv/config";

import { TonClient } from "@ton/ton";

import { Lottery } from "../build/Lottery/Lottery_Lottery.js";
import { endpoint, formatIon, requireContractAddress } from "./lottery-utils.js";

const address = requireContractAddress();
const client = new TonClient({ endpoint });
const lottery = client.open(Lottery.fromAddress(address));
const getInstantDraws = async () => {
  try {
    return await lottery.getGetInstantDraws();
  } catch {
    return false;
  }
};

const [
  owner,
  instantDraws,
  retainedFees,
  dailyPrice,
  nextDailyPrice,
  dailyRound,
  dailyDrawUnlockAt,
  dailyParticipantCount,
  dailyPool,
  lastDailyWinner,
  lastDailyPrize,
  weeklyPrice,
  nextWeeklyPrice,
  weeklyRound,
  weeklyDrawUnlockAt,
  weeklyParticipantCount,
  weeklyPool,
  lastWeeklyWinner,
  lastWeeklyPrize
] = await Promise.all([
  lottery.getGetOwner(),
  getInstantDraws(),
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

console.log(`Endpoint: ${endpoint}`);
console.log(`Contract: ${address.toString({ bounceable: false, urlSafe: true })}`);
console.log(`Owner: ${owner.toString({ bounceable: false, urlSafe: true })}`);
console.log(`Instant draws: ${instantDraws ? "yes" : "no"}`);
console.log(`Retained fees: ${formatIon(retainedFees)}`);
console.log("");
console.log("Daily");
console.log(`  Round: ${dailyRound.toString()}`);
console.log(`  Ticket price: ${formatIon(dailyPrice)}`);
console.log(`  Next ticket price: ${formatIon(nextDailyPrice)}`);
console.log(`  Draw unlock: ${new Date(Number(dailyDrawUnlockAt) * 1000).toISOString()}`);
console.log(`  Participants: ${dailyParticipantCount.toString()}`);
console.log(`  Pool: ${formatIon(dailyPool)}`);
console.log(`  Last winner: ${lastDailyWinner?.toString({ bounceable: false, urlSafe: true }) ?? "none"}`);
console.log(`  Last prize: ${formatIon(lastDailyPrize)}`);
console.log("");
console.log("Weekly");
console.log(`  Round: ${weeklyRound.toString()}`);
console.log(`  Ticket price: ${formatIon(weeklyPrice)}`);
console.log(`  Next ticket price: ${formatIon(nextWeeklyPrice)}`);
console.log(`  Draw unlock: ${new Date(Number(weeklyDrawUnlockAt) * 1000).toISOString()}`);
console.log(`  Participants: ${weeklyParticipantCount.toString()}`);
console.log(`  Pool: ${formatIon(weeklyPool)}`);
console.log(`  Last winner: ${lastWeeklyWinner?.toString({ bounceable: false, urlSafe: true }) ?? "none"}`);
console.log(`  Last prize: ${formatIon(lastWeeklyPrize)}`);
