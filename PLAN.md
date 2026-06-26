# Daily and Weekly Lottery Contract

## Summary

Replace the hello-world contract with one `Lottery` contract that manages two independent pools: daily and weekly. Daily tickets start at `1,000 ION`, weekly tickets start at `5,000 ION`, draws are permissionless after each UTC cutoff, and the owner can set future ticket prices plus withdraw the shared retained 20% fees.

## Key Changes

- Use one deployed contract with duplicated state per lottery:
  - Daily: price, next price, round, draw unlock time, participant count, pool, participants, entered-wallet map, last winner, last prize.
  - Weekly: same fields, independent from daily.
  - Shared: `owner` and `retainedFees`.
- Initial prices:
  - Daily: `1,000 ION`.
  - Weekly: `5,000 ION`.
- Timing:
  - Daily tickets close at `23:59:59` UTC; `DrawDaily` is valid from `00:00:00` UTC the next day.
  - Weekly tickets close Sunday at `23:59:59` UTC; `DrawWeekly` is valid from Monday `00:00:00` UTC.
  - If nobody draws after a cutoff, new purchases for that pool stay blocked until anyone calls that pool's draw.
- Public messages:
  - `"BuyDailyTicket"` and `"BuyWeeklyTicket"`: exact payment only, one ticket per wallet per pool per round.
  - `"DrawDaily"` and `"DrawWeekly"`: callable by anyone after that pool's cutoff.
  - `SetDailyTicketPrice { price: Int as coins }` and `SetWeeklyTicketPrice { price: Int as coins }`: owner-only, effective after that pool's next draw.
  - `"WithdrawFees"`: owner-only, withdraws the shared retained-fee balance.
- Draw behavior:
  - If the pool has participants, select a winner with Tact/TVM `random(0, participantCount)`.
  - Send 80% of that pool to the winner using `SendPayFwdFeesSeparately`.
  - Add 20% to shared `retainedFees`.
  - Reset only the drawn pool and apply that pool's pending ticket price.
  - Empty expired pools advance without payout.
- Update project files from `HelloWorld` to `Lottery`, including config, tests, generated imports, scripts, README, and package script names.

## Test Plan

- Run `npm run build` to generate wrappers.
- Replace hello-world tests with coverage for:
  - Deploy initializes daily/weekly prices, next prices, owner, UTC cutoffs, and empty pools.
  - Daily and weekly exact-price purchases succeed independently.
  - Wrong payment, duplicate wallet per pool, and purchases after cutoff reject.
  - Same wallet can enter both daily and weekly in the same calendar period.
  - Anyone can draw daily after midnight UTC and weekly after Monday midnight UTC.
  - Draws before each cutoff reject.
  - Daily and weekly price changes apply only after that specific pool's next draw.
  - Payout is 80%, retained fee is 20%, and retained fees accumulate across both pools.
  - Empty expired daily/weekly rounds advance cleanly.
  - Non-owner price changes and withdrawals reject.
- Run `npm test`.

## Assumptions

- All calendar boundaries use UTC.
- One wallet gets one entry per pool per round.
- Daily and weekly pools are independent, but retained fees are shared.
- Randomness is simple on-chain pseudo-randomness, not cryptographically strong against validator or timing influence.
