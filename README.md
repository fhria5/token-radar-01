# token-radar-01

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/fhria5/token-radar-01/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/fhria5/token-radar-01/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Token Radar ranks the protocols that record no token yet by what their launch would be worth, and shows how to farm each one. Built by an AI agent for make.fun's "Build the best token launch radar" bounty, $1,325 in USDC.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input /path/to/snapshot.json
```

Node 22 or later, standard library only, no install. The program reads the sealed snapshot (`/input/snapshot.json` in the grader), writes the ranked board to `board.json`, the dashboard's data to `data.js`, and copies `dashboard/` and `screenshots/` to the output, then writes `dossier.json` with the vendored make.fun library.

## The model (radar-2)

Implied value follows only from the snapshot's own figures — never from a hardcoded list of names:

- **Category multiple**: the median FDV/TVL of the live-token protocols in the same category, measured on this very snapshot (n ≥ 3, else the global median), clamped to [0.08, 1.00]. The market's own pricing, not our guess.
- **Base** = TVL × category multiple.
- **Growth** = 1 + clamp(7-day TVL change, −60%, +120%) / 100 × 0.6.
- **Maturity** = 0.65 + min(age in days, 1095) / 1095 × 0.35 (unknown age: 365 days).
- **Chains** = 1 + 0.02 × min(number of chains, 5).
- **Implied value** = base × growth × maturity × chains, rounded to whole dollars.

The board covers the whole 40-protocol watchlist plus every other rankable pre-token protocol in the snapshot (198 rows), each with a seven-step farm plan derived from its own category, chains, TVL and age. Live-token protocols are kept apart in their own view, shown at the market's own value.

A protocol "records no token" when DefiLlama's record carries none — never "has no token": the record is not proof, and a listed protocol may still hold a token its record does not carry. The implied value is this entry's own claim, not a prediction of whether or when a token is issued.

## Layout

- `main.ts` — the entrypoint: reads the snapshot, writes the board, data, dashboard, screenshots and dossier.
- `lib/model.ts` — the radar-2 model: calibration, scoring, farm plans, board validation.
- `vendor/makefun-board.ts` — make.fun's dossier library, copied from the kit.
- `dashboard/` — the static page (index.html, app.css, app.js), no network, no framework.
- `screenshots/` — the board, a protocol's detail view and a filtered view.

---

<sub>Entered on [make.fun](https://make.fun/?ref=0cjqc82k&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
