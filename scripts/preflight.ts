import "dotenv/config";

import { toNano } from "@ton/core";

import { Lottery } from "../build/Lottery/Lottery_Lottery.js";
import { endpoint, formatIon, loadWallet, lotteryOwnerAddress } from "./lottery-utils.js";

const walletContext = await loadWallet();
const balance = await walletContext.client.getBalance(walletContext.wallet.address);
const instantDraws = process.env.LOTTERY_INSTANT_DRAWS === "true";
const ownerAddress = lotteryOwnerAddress(walletContext.wallet.address);
const lottery = await Lottery.fromInit(ownerAddress, instantDraws);

console.log(`Endpoint: ${endpoint}`);
console.log(`Deployer: ${walletContext.wallet.address.toString({ bounceable: false, urlSafe: true })}`);
console.log(`Owner: ${ownerAddress.toString({ bounceable: false, urlSafe: true })}`);
console.log(`Balance: ${balance.toString()} nanoION (${formatIon(balance)})`);
console.log(`Instant draws: ${instantDraws ? "yes" : "no"}`);
console.log(`Predicted contract: ${lottery.address.toString({ bounceable: false, urlSafe: true })}`);
console.log(`Initial daily ticket: ${formatIon(toNano("10000"))}`);
console.log(`Initial weekly ticket: ${formatIon(toNano("50000"))}`);

if (balance < toNano("2")) {
  throw new Error("Deployer balance is below 2 ION. Fund the wallet before deploying.");
}
