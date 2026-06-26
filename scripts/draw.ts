import "dotenv/config";

import {
  endpoint,
  loadWallet,
  parseIonAmount,
  requireContractAddress,
  sendInternal,
  textBody
} from "./lottery-utils.js";

const pool = process.argv[2]?.toLowerCase();
if (pool !== "daily" && pool !== "weekly") {
  throw new Error("Usage: npm run draw -- <daily|weekly> [contract-address]");
}

const address = requireContractAddress(process.env.CONTRACT_ADDRESS ?? process.argv[3]);
const walletContext = await loadWallet();
const value = parseIonAmount(process.env.DRAW_VALUE ?? "0.2", "DRAW_VALUE");
const body = textBody(pool === "daily" ? "DrawDaily" : "DrawWeekly");
const seqno = await sendInternal({
  walletContext,
  to: address,
  value,
  body
});

console.log(`Endpoint: ${endpoint}`);
console.log(`Pool: ${pool}`);
console.log(`Caller: ${walletContext.wallet.address.toString({ bounceable: false, urlSafe: true })}`);
console.log(`Contract: ${address.toString({ bounceable: false, urlSafe: true })}`);
console.log(`Draw transaction sent with seqno ${seqno}.`);
