import "dotenv/config";

import { beginCell } from "@ton/core";

import {
  storeSetDailyTicketPrice,
  storeSetWeeklyTicketPrice
} from "../build/Lottery/Lottery_Lottery.js";
import {
  endpoint,
  formatIon,
  loadWallet,
  parseIonAmount,
  requireContractAddress,
  sendInternal
} from "./lottery-utils.js";

const pool = process.argv[2]?.toLowerCase();
if (pool !== "daily" && pool !== "weekly") {
  throw new Error("Usage: npm run set-price -- <daily|weekly> <price-ion> [contract-address]");
}

const price = parseIonAmount(process.argv[3], "price-ion");
const address = requireContractAddress(process.env.CONTRACT_ADDRESS ?? process.argv[4]);
const walletContext = await loadWallet();
const body =
  pool === "daily"
    ? beginCell().store(storeSetDailyTicketPrice({ $$type: "SetDailyTicketPrice", price })).endCell()
    : beginCell().store(storeSetWeeklyTicketPrice({ $$type: "SetWeeklyTicketPrice", price })).endCell();
const seqno = await sendInternal({
  walletContext,
  to: address,
  value: parseIonAmount(process.env.MESSAGE_VALUE ?? "0.05", "MESSAGE_VALUE"),
  body
});

console.log(`Endpoint: ${endpoint}`);
console.log(`Pool: ${pool}`);
console.log(`Owner: ${walletContext.wallet.address.toString({ bounceable: false, urlSafe: true })}`);
console.log(`Contract: ${address.toString({ bounceable: false, urlSafe: true })}`);
console.log(`Next ticket price: ${formatIon(price)}`);
console.log(`Set-price transaction sent with seqno ${seqno}.`);
