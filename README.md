# Rev Markets — CRE Prediction Market

![Website screenshot](screenshots/homepage.png)

> AI-powered prediction markets on Ethereum Sepolia. Ask any yes/no question, stake ETH on the outcome, and let Chainlink CRE + Google Gemini AI settle it automatically — no admins, no manual intervention, no trusted third party.

🌐 **Live App:** [rev-markets.vercel.app](https://rev-markets.vercel.app)  
📜 **Contract:** [0xCC24b932F524ECCf11E6Eb3B8e9860046328fb71](https://sepolia.etherscan.io/address/0xCC24b932F524ECCf11E6Eb3B8e9860046328fb71#code) · Ethereum Sepolia · Verified ✅

---

## What It Does

Rev Markets is a trustless prediction market where:

1. Anyone creates a yes/no question market (e.g. "Will ETH be above $3000 by June 2026?")
2. Users stake 0.001 ETH on YES or NO — verified as unique humans via World ID
3. Anyone triggers AI settlement by clicking ⚡ on any open market
4. Chainlink CRE detects the on-chain event, queries Google Gemini AI for the outcome
5. Gemini returns YES or NO with a confidence score, CRE writes it back on-chain
6. Winners claim their proportional share of the ETH pool

---

## Architecture

```
User clicks ⚡ Request AI Settlement
           │
           ▼
PredictionMarket.sol
requestSettlement(marketId)
emits SettlementRequested(marketId, question)
           │
           ▼
Chainlink CRE — EVM Log Trigger
Detects SettlementRequested event on Ethereum Sepolia
           │
           ▼
CRE TypeScript Workflow
├── Step 1: Read market state on-chain (getMarket)
├── Step 2: Query Google Gemini AI with the question
├── Step 3: Parse YES/NO + confidence score
└── Step 4: Call onReport() to settle market on-chain
           │
           ▼
PredictionMarket.sol
onReport() → market.settled = true
             market.outcome = YES/NO
             market.confidence = %
           │
           ▼
Winners call claim(marketId)
Receive proportional ETH payout from pool
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Smart Contract | Solidity 0.8.24 · Foundry · Ethereum Sepolia |
| Automation | Chainlink CRE — EVM Log Trigger + EVM Write |
| AI Settlement | Google Gemini 2.0 Flash |
| Frontend | React 19 · Vite · Thirdweb SDK |
| Wallet Auth | Thirdweb ConnectButton |
| Sybil Resistance | World ID — Device Verification |
| Monitoring & Simulation | Tenderly — Virtual TestNet + Transaction Tracer |


---

## Smart Contract

**`PredictionMarket.sol`** — single contract handles everything:

- `createMarket(string question)` — create a yes/no market
- `predict(uint256 marketId, uint8 side)` — stake 0.001 ETH on YES (0) or NO (1)
- `requestSettlement(uint256 marketId)` — trigger CRE + Gemini settlement
- `onReport(uint256 marketId, uint8 outcome, uint16 confidence)` — CRE writes result
- `claim(uint256 marketId)` — winners withdraw proportional ETH payout
- `getMarket(uint256 marketId)` — read full market state
- `getPrediction(uint256 marketId, address user)` — read user position

**Deployed:** `0xCC24b932F524ECCf11E6Eb3B8e9860046328fb71`  
**Forwarder:** `0x15fc6ae953e024d975e77382eeec56a9101f9f88`  
**Verified:** [View on Etherscan ↗](https://sepolia.etherscan.io/address/0x4a5545507513Be545583efef7aD515bc6Ab2385b#code)

---

## CRE Workflow

The CRE workflow lives in `cre-contracts/my-project/my-workflow/`:

| File | Purpose |
|---|---|
| `main.ts` | Entry point — EVM Log Trigger setup |
| `logCallback.ts` | Handles SettlementRequested events |
| `gemini.ts` | Queries Gemini AI, parses YES/NO + confidence |
| `httpCallback.ts` | HTTP trigger handler |
| `config.staging.json` | Contract address + chain config |
| `workflow.yaml` | CRE workflow definition |
| `secrets.yaml` | Maps GEMINI_API_KEY secret |

**Trigger:** EVM Log on `SettlementRequested(uint256,string)` event  
**Chain:** Ethereum Sepolia (`ethereum-testnet-sepolia`)  
**Gas limit:** 500,000

---

## Repository Structure

```
cre-prediction-market-2/
├── cre-contracts/
│   ├── src/
│   │   └── PredictionMarket.sol      # Main contract
│   ├── foundry.toml                  # Foundry config
│   ├── .env                          # Private key, RPC, contract address
│   └── my-project/
│       └── my-workflow/
│           ├── main.ts               # CRE workflow entry
│           ├── logCallback.ts        # Event handler
│           ├── gemini.ts             # Gemini AI integration
│           ├── httpCallback.ts       # HTTP trigger handler
│           ├── config.staging.json   # Staging config
│           ├── workflow.yaml         # CRE workflow definition
│           └── secrets.yaml          # Secret mappings
└── frontend/
    ├── src/
    │   ├── App.jsx                   # Main app — sidebar + market grid
    │   ├── components/
    │   │   ├── Header.jsx            # Nav + wallet connect
    │   │   ├── MarketCard.jsx        # Market card + World ID + actions
    │   │   ├── MarketGrid.jsx        # 3-column grid
    │   │   ├── CreateMarketModal.jsx # Create market form
    │   │   ├── StatsBar.jsx          # Total/open/volume stats
    │   │   ├── HowItWorks.jsx        # Landscape modal explaining flow
    │   │   └── Toast.jsx             # Notifications
    │   └── lib/
    │       ├── contracts.js          # ABI + address
    │       └── utils.js              # fmtEth, calcProb helpers
    ├── vite.config.js
    └── package.json
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) v18+
- [Foundry](https://getfoundry.sh)
- [Chainlink CRE CLI](https://docs.chain.link/cre)
- Ethereum Sepolia wallet with test ETH ([faucet](https://sepoliafaucet.com))
- [Gemini API key](https://aistudio.google.com)
- [Thirdweb client ID](https://thirdweb.com)

---

### 1. Clone the repo

```bash
git clone https://github.com/livinalt/cre-prediction-market-2.git
cd cre-prediction-market-2
```

---

### 2. Deploy the contract (optional — already deployed)

```bash
cd cre-contracts

# Set up environment
cp .env.example .env
# Fill in:
# CRE_ETH_PRIVATE_KEY=0x...
# SEPOLIA_RPC=https://...
# ETHERSCAN_API_KEY=...

# Deploy
forge script script/Deploy.s.sol \
  --rpc-url $SEPOLIA_RPC \
  --private-key $CRE_ETH_PRIVATE_KEY \
  --broadcast -vv

# Verify on Etherscan
forge verify-contract <DEPLOYED_ADDRESS> \
  src/PredictionMarket.sol:PredictionMarket \
  --chain sepolia \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  --constructor-args $(cast abi-encode "constructor(address)" <FORWARDER_ADDRESS>)
```

---

### 3. Set up the CRE workflow

```bash
cd cre-contracts/my-project

# Set up secrets
cp secrets.yaml.example secrets.yaml
# Fill in GEMINI_API_KEY_VAR

# Set up environment
echo "CRE_ETH_PRIVATE_KEY=0x..." > .env
echo "GEMINI_API_KEY_VAR=your_key" >> .env

# Update contract address in config
# Edit my-workflow/config.staging.json → marketAddress

# Install dependencies
npm install

# Simulate the workflow (test before deploying)
cre workflow simulate my-workflow --broadcast
# Select: Log trigger
# Paste a requestSettlement tx hash from Etherscan
```

---

### 4. Run the frontend

```bash
cd frontend

# Install dependencies
npm install --legacy-peer-deps

# Set up environment
cp .env.example .env
# Fill in:
# VITE_CLIENT_ID=your_thirdweb_client_id

# Start dev server
npm run dev
# → http://localhost:5173
```

---

### 5. Deploy frontend to Vercel

```bash
# Make sure vite.config.js has base: '/'
# Then push to GitHub — Vercel auto-deploys

# Or deploy manually
npm run build
vercel --prod
```


## End-to-End Demo Flow

```bash
# 1. Create a market
cast send 0xCC24b932F524ECCf11E6Eb3B8e9860046328fb71 \
  "createMarket(string)" "Will ETH be above 2000 USD by March 2026?" \
  --rpc-url $SEPOLIA_RPC --private-key $CRE_ETH_PRIVATE_KEY

# 2. Place a prediction (YES = 0, NO = 1)
cast send 0xCC24b932F524ECCf11E6Eb3B8e9860046328fb71 \
  "predict(uint256,uint8)" 0 0 \
  --value 0.001ether \
  --rpc-url $SEPOLIA_RPC --private-key $CRE_ETH_PRIVATE_KEY

# 3. Request AI settlement
cast send 0xCC24b932F524ECCf11E6Eb3B8e9860046328fb71 \
  "requestSettlement(uint256)" 0 \
  --rpc-url $SEPOLIA_RPC --private-key $CRE_ETH_PRIVATE_KEY

# 4. Simulate CRE workflow (Windows)
cre workflow simulate my-workflow --broadcast
# → Select Log trigger → paste tx hash from step 3

# 5. Check settlement result
cast call 0xCC24b932F524ECCf11E6Eb3B8e9860046328fb71 \
  "getMarket(uint256)((address,uint48,uint48,bool,uint16,uint8,uint256,uint256,string))" 0 \
  --rpc-url $SEPOLIA_RPC

# 6. Claim winnings (if you won)
cast send 0xCC24b932F524ECCf11E6Eb3B8e9860046328fb71 \
  "claim(uint256)" 0 \
  --rpc-url $SEPOLIA_RPC --private-key $CRE_ETH_PRIVATE_KEY
```

---

## Key Transactions (Sepolia)

| Action | Tx Hash |
|---|---|
| Contract deployment | `0x721025a2ef6bddb5e6fdd1d74730cca402854bae41574a43968060f1fba4113a` |
| First market created | `0x671e702f11bc7d252b395f9e057de35afc82abf0face9ee6b385b07f602fe9b9` |
| First prediction placed | `0x2c5f1fc33c0bb63f8484ff3c7fea486195992049d4141f7b72636c826f955333` |
| Settlement requested | `0xa725e0bd87584342e2de246ff71799a7c4235eeb28515004e5dd4d1b151782ce` |

---

## Tenderly Integration

Tenderly is used throughout development for three purposes:

![Rev Market Tenderly Virtual Testnet](screenshots/tenderly_screenshot.png)

**1. Transaction Monitoring**
Every transaction on `PredictionMarket.sol` is visible in real time with full execution traces, decoded logs, state diffs, and gas breakdowns — far more detail than Etherscan alone. This was used to debug `requestSettlement`, `onReport`, and `claim` calls during development.

**2. Transaction Simulation**
Before sending real transactions, Tenderly's simulator previews exact state changes, return values, and potential reverts without spending gas. Used to verify settlement logic and payout calculations before broadcasting.

**3. Virtual TestNet**
A forked Ethereum Sepolia environment was used to test the full end-to-end flow — deploying contracts, placing predictions, triggering CRE settlement, and claiming winnings — in an isolated environment with custom ETH balances before going live on real Sepolia.

🔗 **Tenderly Dashboard:** [View Project ↗](https://dashboard.tenderly.co/Jerly/cx/testnet/6b716f89-d035-49ad-a3c2-a6f63fc442b0)

---

## World ID Integration

Predictions are gated by [World ID](https://worldcoin.org/world-id) device verification — proving a user is a unique human before they can stake ETH. Verification happens once per session; after that all predictions on any market go through without re-verification.

- **App ID:** `app_52bcb1ea37b432cf6a3e85f97160fc9e`
- **Action:** `predict`
- **Level:** Device verification
- **Max verifications:** Unique per user

---

## Environment Variables

### `cre-contracts/.env`
```
CRE_ETH_PRIVATE_KEY=0x...
SEPOLIA_RPC=https://ethereum-sepolia-rpc.publicnode.com
MARKET_ADDRESS=0xCC24b932F524ECCf11E6Eb3B8e9860046328fb71
ETHERSCAN_API_KEY=...
```

### `cre-contracts/my-project/.env`
```
CRE_ETH_PRIVATE_KEY=0x...
GEMINI_API_KEY_VAR=...
```

### `frontend/.env`
```
VITE_CLIENT_ID=your_thirdweb_client_id
```

---

## Built With

- [Chainlink CRE](https://docs.chain.link/cre) — Compute, trigger, and write automation
- [Google Gemini AI](https://ai.google.dev) — Natural language market resolution
- [World ID](https://worldcoin.org/world-id) — Proof of personhood / Sybil resistance
- [Tenderly](https://tenderly.co) — Transaction monitoring, simulation, and Virtual TestNet
- [Thirdweb](https://thirdweb.com) — Wallet connection + contract interaction
- [Foundry](https://getfoundry.sh) — Smart contract development + testing
- [Vite + React](https://vitejs.dev) — Frontend framework

---

## License

MIT