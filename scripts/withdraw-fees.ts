import "dotenv/config";

import {
  endpoint,
  loadWallet,
  parseIonAmount,
  requireContractAddress,
  sendInternal,
  textBody
} from "./lottery-utils.js";

const address = requireContractAddress();
const walletContext = await loadWallet();
const seqno = await sendInternal({
  walletContext,
  to: address,
  value: parseIonAmount(process.env.MESSAGE_VALUE ?? "0.1", "MESSAGE_VALUE"),
  body: textBody("WithdrawFees")
});

console.log(`Endpoint: ${endpoint}`);
console.log(`Owner: ${walletContext.wallet.address.toString({ bounceable: false, urlSafe: true })}`);
console.log(`Contract: ${address.toString({ bounceable: false, urlSafe: true })}`);
console.log(`Withdraw transaction sent with seqno ${seqno}.`);
