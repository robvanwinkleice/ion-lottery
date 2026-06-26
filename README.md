# ION Lottery

Daily and weekly lottery dApp for the Ice Open Network (ION).

The project contains a Tact smart contract and a dark-mode Next.js frontend. Players buy fixed-price tickets from the homepage. The contract selects one winner per pool, sends 80% of the pool to the winner, and keeps 20% as owner-withdrawable fees.

## Features

- Native ION smart contract written in Tact
- Daily and weekly lottery pools
- One ticket per wallet per pool per round
- Exact-price ticket purchases
- Permissionless draw calls after the configured cutoff
- 80% winner payout and 20% retained lottery fee
- Owner-managed next-round ticket prices
- Owner-only retained-fee withdrawal
- Optional instant-draw deployment mode for testing
- Next.js frontend with ION Wallet Chrome extension support
- `/admin` access gated by the on-chain owner wallet

## Current Defaults

- Daily ticket: `10,000 ION`
- Weekly ticket: `50,000 ION`
- Daily draw: `00:00:00 UTC`
- Weekly draw: Monday `00:00:00 UTC`
- Payout: `80%`
- Retained fee: `20%`

Use `LOTTERY_INSTANT_DRAWS=true` only for testing contracts. Production deployments should leave it disabled.

## Tech Stack

- Tact
- ION / TON-compatible TVM tooling
- `@ton/core`, `@ton/ton`, `@ton/sandbox`
- Next.js App Router
- React
- TypeScript
- Vitest
- Vercel-ready frontend

## Project Structure

```text
app/                    Next.js UI
app/admin/              Owner-only admin page
contracts/lottery.tact  Lottery smart contract
scripts/                Wallet, deploy, read, buy, draw, admin scripts
tests/                  Sandbox contract tests
public/                 Static assets
design/                 UI reference design assets
```

## Requirements

- Node.js 24 or newer
- npm
- Native ION for deployment and transactions
- ION Wallet Chrome extension for browser usage

ION Wallet:

```text
https://chromewebstore.google.com/detail/ion-wallet/hfajfpbjlmembfdlhakjmefnbhjddofb
```

Default ION mainnet RPC endpoint:

```text
https://api.mainnet.ice.io/http/v2/jsonRPC
```

## Setup

Install dependencies:

```bash
npm install
```

Create an environment file:

```bash
cp .env.example .env
```

Generate a deploy wallet if you do not already have one:

```bash
npm run wallet
```

The generated mnemonic is for a native ION/TON-style wallet used by the deploy scripts. It is not a MetaMask Secret Recovery Phrase.

Never commit `.env`, mnemonics, private keys, or funded wallet secrets.

## Environment Variables

```text
ION_ENDPOINT=https://api.mainnet.ice.io/http/v2/jsonRPC
ION_MNEMONIC="word1 word2 ... word24"
CONTRACT_ADDRESS=
LOTTERY_OWNER_ADDRESS=
LOTTERY_INSTANT_DRAWS=false
DRAW_KEEPER_MNEMONIC="word1 word2 ... word24"
DRAW_VALUE=0.2
MESSAGE_VALUE=0.1
CRON_SECRET=
NEXT_PUBLIC_ION_ENDPOINT=https://api.mainnet.ice.io/http/v2/jsonRPC
NEXT_PUBLIC_CONTRACT_ADDRESS=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Important variables:

- `ION_MNEMONIC`: funded deployer wallet mnemonic used by scripts.
- `CONTRACT_ADDRESS`: deployed contract used by CLI scripts.
- `LOTTERY_OWNER_ADDRESS`: optional admin/owner wallet. If omitted, the deployer becomes owner.
- `LOTTERY_INSTANT_DRAWS`: set to `true` only for test contracts where draws should be immediately available.
- `DRAW_KEEPER_MNEMONIC`: funded non-owner wallet used by the Vercel cron draw keeper.
- `DRAW_VALUE`: ION attached to each draw message. Defaults to `0.2`.
- `CRON_SECRET`: required secret for protecting the cron API route.
- `NEXT_PUBLIC_CONTRACT_ADDRESS`: deployed contract used by the browser UI.

## Build And Test

Compile contract and frontend:

```bash
npm run build
```

Run contract tests:

```bash
npm test
```

Run TypeScript checks:

```bash
npx tsc --noEmit
```

Build only the UI:

```bash
npm run ui:build
```

Recommended pre-release checks:

```bash
npm run build
npx tsc --noEmit
npm test
npm run ui:build
npm audit --omit=dev
```

## Deploy A Contract

Check the deployer balance and predicted address:

```bash
npm run preflight
```

Deploy with the deployer wallet as owner:

```bash
npm run deploy
```

Deploy with a separate owner/admin wallet:

```bash
LOTTERY_OWNER_ADDRESS=<owner-wallet-address> npm run deploy
```

Deploy an instant-draw test contract:

```bash
LOTTERY_INSTANT_DRAWS=true npm run preflight
LOTTERY_INSTANT_DRAWS=true npm run deploy
```

Deploy an instant-draw test contract with a separate admin wallet:

```bash
LOTTERY_OWNER_ADDRESS=<owner-wallet-address> LOTTERY_INSTANT_DRAWS=true npm run deploy
```

After deployment, set:

```text
CONTRACT_ADDRESS=<deployed-contract-address>
NEXT_PUBLIC_CONTRACT_ADDRESS=<deployed-contract-address>
```

Read contract state:

```bash
npm run read
```

## CLI Operations

Buy tickets:

```bash
npm run buy -- daily
npm run buy -- weekly
```

Trigger draws:

```bash
npm run draw -- daily
npm run draw -- weekly
```

Set next-round prices as owner:

```bash
npm run set-price -- daily 10
npm run set-price -- weekly 100
```

Trigger retained-fee withdrawal to the owner wallet:

```bash
npm run withdraw
```

You can also pass a contract address explicitly:

```bash
CONTRACT_ADDRESS=<deployed-contract-address> npm run read
CONTRACT_ADDRESS=<deployed-contract-address> npm run buy -- daily
```

## Run The Frontend

Start the local Next.js app:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Pages:

- `/`: player-facing lottery pools
- `/admin`: owner-only admin controls
- `/history`: placeholder history page
- `/winners`: placeholder winners page
- `/docs`: placeholder docs page

The homepage hides operational controls such as draw execution. Admin controls are hidden unless the connected ION Wallet address matches the contract owner.

## Deploy The Frontend To Vercel

Use the default build command:

```bash
npm run build
```

Set these Vercel environment variables:

```text
NEXT_PUBLIC_ION_ENDPOINT=https://api.mainnet.ice.io/http/v2/jsonRPC
NEXT_PUBLIC_CONTRACT_ADDRESS=<deployed-contract-address>
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

If you want automatic draws, also set:

```text
ION_ENDPOINT=https://api.mainnet.ice.io/http/v2/jsonRPC
CONTRACT_ADDRESS=<deployed-contract-address>
DRAW_KEEPER_MNEMONIC="<24 word keeper wallet mnemonic>"
DRAW_VALUE=0.2
CRON_SECRET="<random long secret>"
```

Do not use the owner/admin wallet mnemonic as the draw keeper. Draws are permissionless, so the keeper wallet only needs enough ION to pay draw transaction fees.

The included `vercel.json` runs:

```json
{
  "crons": [
    {
      "path": "/api/cron/draw",
      "schedule": "1 0 * * *"
    }
  ]
}
```

That calls `/api/cron/draw` every day at `00:01 UTC`. The route checks both pools and retained fees. For normal contracts, it draws when the cutoff has passed, even if the pool is empty, so expired rounds do not block future ticket buys. For instant-draw test contracts, it draws only pools with participants to avoid wasting keeper gas. If retained fees already exist, the route also sends `WithdrawFees`; anyone can trigger this message, but the contract always transfers retained fees to the owner wallet.

Do not add `ION_MNEMONIC` to Vercel unless you intentionally run deployer or owner signing code there. The public UI sends user transactions through the browser wallet.

## Native ION vs BSC ION

ION Wallet uses native ION-chain addresses, usually in `UQ...` or `EQ...` format.

MetaMask uses EVM addresses, usually in `0x...` format. ION held in MetaMask on BSC is not native ION and cannot be sent directly to a native ION wallet address. Bridge or swap to native ION before sending to an ION-chain wallet.

Use a small test transfer first whenever moving funds across wallets or networks.

## Security Notes

This project is experimental and has not been externally audited.

Known caveats:

- The draw uses TVM/Tact pseudo-randomness, not an external randomness beacon.
- Instant-draw mode is for testing only.
- Frontend admin gating is a UX layer only. The smart contract remains the authority for owner-only operations.
- Always verify the deployed contract address before funding or sharing the UI.

Before handling meaningful value, run a testnet rehearsal and get an independent smart-contract review.

## License

Add a license before publishing publicly. MIT is a common default for open-source dApps, but choose the license that matches your intended use.
