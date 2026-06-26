const address = process.env.TESTNET_ADDRESS ?? process.argv[2];

if (!address) {
  throw new Error("Missing TESTNET_ADDRESS. Pass the testnet-formatted wallet address printed by npm run wallet.");
}

const endpoint = `https://faucet.testnet.ice.io/frost-send/${encodeURIComponent(address)}`;
const response = await fetch(endpoint, { headers: { accept: "application/json,text/plain,*/*" } });
const text = await response.text();

console.log(`Faucet HTTP ${response.status}`);
console.log(text);

if (!response.ok) {
  throw new Error("Faucet request failed.");
}

export {};
