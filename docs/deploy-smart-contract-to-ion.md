# Deploy A Smart Contract To ION

This guide explains how to deploy the ION Lottery smart contract to Ice Open Network mainnet using the scripts in this repository.

ION is TON-derived, so this project uses Tact and TON-compatible tooling rather than Solidity, Hardhat, Foundry, or MetaMask deployment flows.

## Prerequisites

- Node.js 24 or newer
- npm
- A funded native ION deployer wallet
- The 24-word mnemonic for that deployer wallet
- Optional: a separate owner/admin wallet address

Install dependencies:

```bash
npm install
```

Build the contract bindings:

```bash
npm run build:contract
```

Run tests before deploying:

```bash
npm test
```

## Create A Deployer Wallet

Generate a native ION wallet:

```bash
npm run wallet
```

The script prints:

- Mainnet wallet address
- Testnet-formatted wallet address
- 24-word mnemonic

Store the mnemonic securely. Do not commit it.

Important: this is a native ION/TON-style wallet, not a MetaMask wallet. Native ION addresses usually start with `UQ` or `EQ`. MetaMask/BSC addresses start with `0x` and are not directly compatible.

## Fund The Deployer

Send native ION to the deployer address. The deploy script currently requires at least `2 ION`, but keep extra balance for retries and contract operations.

If your tokens are on BSC, bridge or swap them to native ION first. Do not send BSC ION directly to a native `UQ...` address unless a bridge explicitly instructs you to do so.

## Configure Environment

Copy the example env file:

```bash
cp .env.example .env
```

Set at least:

```env
ION_ENDPOINT=https://api.mainnet.ice.io/http/v2/jsonRPC
ION_MNEMONIC="your 24 word deployer wallet mnemonic"
LOTTERY_INSTANT_DRAWS=false
```

Optional owner/admin wallet:

```env
LOTTERY_OWNER_ADDRESS=UQ...
```

If `LOTTERY_OWNER_ADDRESS` is empty, the deployer wallet becomes the contract owner. If it is set, the deployer pays for deployment but the configured address becomes the contract owner.

For production, leave:

```env
LOTTERY_INSTANT_DRAWS=false
```

Use instant mode only for disposable test contracts:

```env
LOTTERY_INSTANT_DRAWS=true
```

## Check The Predicted Contract

Run preflight:

```bash
npm run preflight
```

This prints:

- RPC endpoint
- Deployer address
- Owner address
- Deployer balance
- Instant-draw mode
- Predicted contract address
- Initial ticket prices

Example:

```text
Endpoint: https://api.mainnet.ice.io/http/v2/jsonRPC
Deployer: UQ...
Owner: UQ...
Balance: 995 ION
Instant draws: no
Predicted contract: UQ...
Initial daily ticket: 1000 ION
Initial weekly ticket: 5000 ION
```

If the deployer balance is too low, fund it before continuing.

## Deploy

Deploy to ION mainnet:

```bash
npm run deploy
```

The script sends an internal deploy message from the deployer wallet, waits for the contract to become active, then prints the deployed address.

Example:

```text
Contract address: UQ...
Contract is active.
```

## Verify The Contract

Set the deployed contract in `.env`:

```env
CONTRACT_ADDRESS=UQ...
NEXT_PUBLIC_CONTRACT_ADDRESS=UQ...
```

Read the on-chain state:

```bash
npm run read
```

Confirm:

- Owner address is correct
- `Instant draws` is correct
- Daily ticket price is correct
- Weekly ticket price is correct
- Pools start empty
- Draw unlock timestamps are expected

You can also inspect the contract in the ION explorer:

```text
https://explorer.ice.io/address/<contract-address>
```

## Update The Frontend

The browser UI reads the contract address from:

```env
NEXT_PUBLIC_CONTRACT_ADDRESS=UQ...
```

For local development:

```bash
npm run dev
```

For Vercel production, set:

```env
NEXT_PUBLIC_ION_ENDPOINT=https://api.mainnet.ice.io/http/v2/jsonRPC
NEXT_PUBLIC_CONTRACT_ADDRESS=UQ...
```

Then redeploy the Vercel app.

## Automatic Draws And Fee Withdrawal

This repository includes a Vercel cron route:

```text
/api/cron/draw
```

The schedule is defined in `vercel.json`:

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

For cron to work, set these server-side Vercel environment variables:

```env
ION_ENDPOINT=https://api.mainnet.ice.io/http/v2/jsonRPC
CONTRACT_ADDRESS=UQ...
DRAW_KEEPER_MNEMONIC="24 word keeper wallet mnemonic"
DRAW_VALUE=0.2
CRON_SECRET="random long secret"
```

Use a dedicated low-balance keeper wallet for `DRAW_KEEPER_MNEMONIC`. Do not use the owner wallet. Draws and fee withdrawals are permissionless, and the contract always sends retained fees to the owner address.

Manual cron test:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://YOUR_DOMAIN.vercel.app/api/cron/draw
```

If no draw is due, the route should return `action: "skipped"`.

## Change Ticket Prices

Owner-only price updates:

```bash
npm run set-price -- daily 1000
npm run set-price -- weekly 5000
```

Behavior:

- If the pool has no participants, the new price applies immediately.
- If the pool already has participants, the new price applies after the next draw.

## Common Issues

### The UI Shows The Old Contract

Check `NEXT_PUBLIC_CONTRACT_ADDRESS`. Next.js embeds public env vars at build time, so Vercel must be redeployed after changing it.

### The Admin Page Is Locked

The connected ION Wallet must match the contract owner returned by:

```bash
npm run read
```

### The Cron Route Returns Unauthorized

Set `CRON_SECRET` in Vercel and call the route with:

```text
Authorization: Bearer <CRON_SECRET>
```

### The Keeper Cannot Draw

Fund the keeper wallet with native ION. The keeper pays transaction fees and attached draw value.

## Security Checklist

- Never commit `.env`.
- Never commit mnemonics.
- Do not use the owner wallet as the cron keeper.
- Use `LOTTERY_INSTANT_DRAWS=false` for production.
- Verify the owner address before deployment.
- Verify the deployed contract address before publishing the UI.
- Run `npm test`, `npx tsc --noEmit`, and `npm run build` before deploying.
