# CRE-Powered Prediction Market Settlement Engine

> Automated, verifiable market settlement using Chainlink CRE on Base Sepolia.
> Supports both numeric price markets and real-world event markets.

## Overview

This project demonstrates a two-system prediction market infrastructure where all settlement is automated by Chainlink CRE — no admin keys, no manual intervention, no centralized oracle owner.

**System 1 — Price Markets:** Was ETH above $3000 at expiry?
**System 2 — Event Markets:** Did a real-world event happen? (volume thresholds, football results, governance votes)

Both systems share the same CRE orchestration pattern. Only the data source and aggregation method change per market type.

---

## Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                     CHAINLINK CRE LAYER                          │
│                                                                  │
│   price-job-spec.toml            event-job-spec.toml            │
│   ┌──────────────────┐           ┌──────────────────┐           │
│   │ Binance  HTTP    │           │ API-Football HTTP │           │
│   │ CoinGecko HTTP   │           │ Binance Vol HTTP  │           │
│   │ Gate.io  HTTP    │           │ Gate.io  Vol HTTP │           │
│   └────────┬─────────┘           └────────┬──────────┘          │
│        Median                         Majority Vote              │
│        (tamper-resistant)             (2 of 3 sources)          │
│            │                               │                     │
│       eth_tx task                     eth_tx task               │
└────────────┼───────────────────────────────┼─────────────────────┘
             │                               │
             ▼                               ▼
┌────────────────────────┐   ┌───────────────────────────┐
│   SettlementEngine     │   │   EventSettlementEngine    │
│   executeSettlement    │   │   executeSettlement        │
│   (uint256 price)      │   │   (uint8 outcome)          │
│   replay protection    │   │   replay protection        │
└──────────┬─────────────┘   └─────────────┬──────────────┘
           │                               │
           ▼                               ▼
┌────────────────────────┐   ┌───────────────────────────┐
│   PredictionMarket     │   │   EventMarket              │
│                        │   │                            │
│   strike: $3000        │   │   question: string         │
│   settled: uint256     │   │   outcome: YES/NO/INVALID  │
│   payout: proportional │   │   payout: proportional     │
│                        │   │   refund: if INVALID       │
└────────────────────────┘   └───────────────────────────┘
```

---

## Why Two Aggregation Methods?

**Price markets → Median**
```
Binance:   $1963
CoinGecko: $1963  ← median (correct)
Gate.io:   $9999  ← spike ignored

Median: $1963  ✅
Mean:   $4641  ❌
```
Median is manipulation-resistant — one bad source cannot move the result.

**Event markets → Majority Vote**
```
Check 1 (score comparison): YES ✅
Check 2 (API winner flag):  YES ✅
Check 3 (score difference): NO  ❌

Votes: 2/3 YES → Outcome: YES ✅
```
Majority vote handles yes/no questions across independent data evaluations.
If any source is unreachable or the event is incomplete → INVALID → full refunds.

---

## Deployed Contracts (Base Sepolia)

### Price Market System
| Contract | Address |
|---|---|
| PredictionMarket | `0xD8846806e200604428E6c40f6c3ed6B80c3a70DF` |
| SettlementEngine | `0xA32d2AD94b9C1795d44385F16Bf5366131e0F362` |

### Event Market System
| Contract | Address |
|---|---|
| EventMarket | `0xE6B57AAfA330D6d51058Ddbfe2e16A2F60951a69` |
| EventSettlementEngine | `0x1769eC29AE46BB2EC2CFB002e9E7b368d95E377E` |

All four contracts verified on Basescan.

---

## Supported Event Types

| Event | Data Source | Resolution | Status |
|---|---|---|---|
| ETH price vs strike | Binance, CoinGecko, Gate.io | Median | ✅ Live demo |
| 24h volume threshold | Binance, CoinGecko, Gate.io | Majority vote | ✅ Live demo |
| Football match result | API-Football | Majority vote | ✅ Live demo |
| On-chain governance | cast call (blockchain read) | Majority vote | 🔧 Swap job spec |
| Weather threshold | OpenWeatherMap | Majority vote | 🔧 Swap job spec |
| Election result | AP Elections API | Majority vote | 🔧 Swap job spec |

Adding a new event type requires zero contract changes — only the CRE job spec data sources change.

---

## Smart Contract Design

### PredictionMarket.sol
- Creates markets with strike price and expiry timestamp
- Accepts ETH positions on ABOVE or BELOW
- Settles only via authorized SettlementEngine
- Pays winners proportionally from total pool

### SettlementEngine.sol
- Accepts calls only from CRE forwarder address
- Replay protection via `keccak256(marketId, price)` mapping
- Single entry point between CRE and market contract

### EventMarket.sol
- Creates markets with arbitrary question string (immutable after creation)
- Accepts ETH positions on YES or NO
- Three outcomes: YES, NO, INVALID
- INVALID triggers full refunds to all participants
- Replay-safe: settled markets cannot be re-settled

### EventSettlementEngine.sol
- Accepts `uint8 outcome` (1=YES, 2=NO, 3=INVALID)
- Same replay protection pattern as SettlementEngine
- Owner can rotate CRE forwarder address

---

## CRE Integration

Two job specs in `cre/`:

**`cre/job-spec.toml`** — Price market settlement
1. `check_expiry` — blockchain_read, exits if not ready
2. `fetch_binance/coingecko/gateio` — parallel HTTP tasks
3. `compute_median` — built-in CRE median task, multiplies by 1e8
4. `submit_settlement` — eth_tx to SettlementEngine

**`cre/event-job-spec.toml`** — Event market settlement
1. `check_expiry` — blockchain_read, exits if not ready
2. `fetch_*_volume` — parallel HTTP tasks per source
3. `eval_*` — compare tasks, return 0 or 1
4. `majority_vote` — sum of evaluations
5. `map_outcome` — conditional maps to 1/2/3
6. `submit_settlement` — eth_tx to EventSettlementEngine

---

## Repository Structure
```
cre-prediction-market/
├── src/
│   ├── PredictionMarket.sol       # Price market logic
│   ├── SettlementEngine.sol       # CRE entry point for price markets
│   ├── EventMarket.sol            # Event market logic + INVALID refund
│   └── EventSettlementEngine.sol  # CRE entry point for event markets
├── test/
│   ├── PredictionMarket.t.sol     # 10 tests
│   └── EventMarket.t.sol          # 12 tests
├── script/
│   ├── Deploy.s.sol               # Deploy price market system
│   ├── DeployEvent.s.sol          # Deploy event market system
│   └── demo.sh                    # Price market end-to-end demo
├── cre/
│   ├── job-spec.toml              # CRE workflow — price markets
│   ├── event-job-spec.toml        # CRE workflow — event markets
│   ├── simulate.sh                # Price market simulation
│   ├── event-simulate.sh          # Volume event simulation
│   └── football-simulate.sh       # Football event simulation
└── README.md
```

---

## Quick Start
```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash && foundryup

# Clone
git clone https://github.com/YOUR_USERNAME/cre-prediction-market
cd cre-prediction-market

# Environment
cp .env.example .env
# Fill in PRIVATE_KEY, BASE_SEPOLIA_RPC, ETHERSCAN_API_KEY,
# CRE_FORWARDER_ADDRESS, FOOTBALL_API_KEY

# Test
forge test -vv

# Deploy price market system
forge script script/Deploy.s.sol:Deploy \
  --rpc-url $BASE_SEPOLIA_RPC --private-key $PRIVATE_KEY --broadcast -vv

# Deploy event market system
forge script script/DeployEvent.s.sol:DeployEvent \
  --rpc-url $BASE_SEPOLIA_RPC --private-key $PRIVATE_KEY --broadcast -vv
```

---

## Demo Flow
```bash
# Demo 1: Price market — ETH vs $3000 strike
bash script/demo.sh

# Demo 2: Event market — ETH volume threshold
bash cre/event-simulate.sh

# Demo 3: Football event — match result + INVALID guard
bash cre/football-simulate.sh
```
