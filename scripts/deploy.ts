import "dotenv/config";

import { toNano } from "@ton/core";

import { Lottery } from "../build/Lottery/Lottery_Lottery.js";
import { endpoint, formatIon, loadWallet, lotteryOwnerAddress, sendInternal, textBody } from "./lottery-utils.js";

const walletContext = await loadWallet();
const walletAddress = walletContext.wallet.address.toString({ bounceable: false, urlSafe: true });
const balance = await walletContext.client.getBalance(walletContext.wallet.address);
const instantDraws = process.env.LOTTERY_INSTANT_DRAWS === "true";
const ownerAddress = lotteryOwnerAddress(walletContext.wallet.address);

console.log(`Endpoint: ${endpoint}`);
console.log(`Deployer: ${walletAddress}`);
console.log(`Owner: ${ownerAddress.toString({ bounceable: false, urlSafe: true })}`);
console.log(`Balance: ${balance.toString()} nanoION (${formatIon(balance)})`);
console.log(`Instant draws: ${instantDraws ? "yes" : "no"}`);

if (balance < toNano("2")) {
  throw new Error("Deployer balance is below 2 ION. Fund the wallet before deploying.");
}

const lottery = await Lottery.fromInit(ownerAddress, instantDraws);
const seqno = await sendInternal({
  walletContext,
  to: lottery.address,
  value: toNano("1"),
  bounce: false,
  init: lottery.init,
  body: textBody("Deploy")
});

console.log(`Deploy transaction sent with seqno ${seqno}.`);
console.log(`Contract address: ${lottery.address.toString({ bounceable: false, urlSafe: true })}`);
console.log(`Owner: ${ownerAddress.toString({ bounceable: false, urlSafe: true })}`);
console.log("Waiting for deployment to become active...");

for (let i = 0; i < 30; i++) {
  await new Promise((resolve) => setTimeout(resolve, 2000));
  const state = await walletContext.client.getContractState(lottery.address);
  if (state.state === "active") {
    console.log("Contract is active.");
    process.exit(0);
  }
}

throw new Error("Timed out waiting for the contract to become active. Check the address in the ION explorer.");
