import { mnemonicNew, mnemonicToPrivateKey } from "@ton/crypto";
import { WalletContractV4 } from "@ton/ton";

const mnemonic = await mnemonicNew(24);
const keyPair = await mnemonicToPrivateKey(mnemonic);
const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });

console.log("Wallet address:");
console.log(wallet.address.toString({ bounceable: false, urlSafe: true, testOnly: false }));
console.log("");
console.log("Testnet-formatted wallet address:");
console.log(wallet.address.toString({ bounceable: false, urlSafe: true, testOnly: true }));
console.log("");
console.log("Mnemonic:");
console.log(mnemonic.join(" "));
console.log("");
console.log("Note:");
console.log("This is a TON/ION mnemonic for the deploy script, not a MetaMask Secret Recovery Phrase.");
console.log("The printed address is a native ION address, not a BSC/BNB Smart Chain 0x address.");
console.log("If your exchange only offers BSC withdrawals, withdraw to a BSC wallet you control and bridge to ION.");
