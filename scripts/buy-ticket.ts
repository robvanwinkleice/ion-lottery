import "dotenv/config";

import { TonClient } from "@ton/ton";

import { Lottery } from "../build/Lottery/Lottery_Lottery.js";
import {
  endpoint,
  formatIon,
  loadWallet,
  requireContractAddress,
  sendInternal,
  textBody
} from "./lottery-utils.js";

const pool = process.argv[2]?.toLowerCase();
if (pool !== "daily" && pool !== "weekly") {
  throw new Error("Usage: npm run buy -- <daily|weekly> [contract-address]");
}

const address = requireContractAddress(process.env.CONTRACT_ADDRESS ?? process.argv[3]);
const client = new TonClient({ endpoint });
const lottery = client.open(Lottery.fromAddress(address));
const walletContext = await loadWallet();
const price =
  pool === "daily" ? await lottery.getGetDailyTicketPrice() : await lottery.getGetWeeklyTicketPrice();
const body = textBody(pool === "daily" ? "BuyDailyTicket" : "BuyWeeklyTicket");
const seqno = await sendInternal({
  walletContext,
  to: address,
  value: price,
  body
});

console.log(`Endpoint: ${endpoint}`);
console.log(`Pool: ${pool}`);
console.log(`Buyer: ${walletContext.wallet.address.toString({ bounceable: false, urlSafe: true })}`);
console.log(`Contract: ${address.toString({ bounceable: false, urlSafe: true })}`);
console.log(`Ticket price: ${formatIon(price)}`);
console.log(`Ticket purchase sent with seqno ${seqno}.`);
