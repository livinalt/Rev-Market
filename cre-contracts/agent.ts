// agent.ts
// Autonomous agent that creates a market, places a prediction,
// requests settlement, waits for CRE to settle, and claims winnings.
// Run: npx ts-node agent.ts

import { createPublicClient, createWalletClient, http, parseEther, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import * as dotenv from "dotenv";

dotenv.config();

// ── Config ────────────────────────────────────────────────────────────────────
const MARKET_ADDRESS = process.env.MARKET_ADDRESS as `0x${string}`;
const PRIVATE_KEY    = process.env.CRE_ETH_PRIVATE_KEY as `0x${string}`;
const RPC_URL        = process.env.SEPOLIA_RPC || "https://ethereum-sepolia-rpc.publicnode.com";

// Minimal ABI — only what the agent needs
const ABI = [
  {
    name: "createMarket",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "question",       type: "string" },
      { name: "descriptionCID", type: "string" },
    ],
    outputs: [{ name: "marketId", type: "uint256" }],
  },
  {
    name: "predict",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "marketId",   type: "uint256" },
      { name: "prediction", type: "uint8"   },
    ],
    outputs: [],
  },
  {
    name: "requestSettlement",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "claim",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "getMarket",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "creator",        type: "address" },
          { name: "createdAt",      type: "uint48"  },
          { name: "settledAt",      type: "uint48"  },
          { name: "settled",        type: "bool"    },
          { name: "confidence",     type: "uint16"  },
          { name: "outcome",        type: "uint8"   },
          { name: "totalYesPool",   type: "uint256" },
          { name: "totalNoPool",    type: "uint256" },
          { name: "question",       type: "string"  },
          { name: "descriptionCID", type: "string"  },
        ],
      },
    ],
  },
  {
    name: "getNextMarketId",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "getPrediction",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "user",     type: "address" },
    ],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "amount",     type: "uint256" },
          { name: "prediction", type: "uint8"   },
          { name: "claimed",    type: "bool"    },
        ],
      },
    ],
  },
  {
    name: "MarketCreated",
    type: "event",
    inputs: [
      { name: "marketId",       type: "uint256", indexed: true  },
      { name: "question",       type: "string",  indexed: false },
      { name: "descriptionCID", type: "string",  indexed: false },
      { name: "creator",        type: "address", indexed: false },
    ],
  },
  {
    name: "MarketSettled",
    type: "event",
    inputs: [
      { name: "marketId",   type: "uint256", indexed: true  },
      { name: "outcome",    type: "uint8",   indexed: false },
      { name: "confidence", type: "uint16",  indexed: false },
    ],
  },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────
function log(step: string, msg: string) {
  console.log(`\n[${step}] ${msg}`);
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForSettlement(
  publicClient: ReturnType<typeof createPublicClient>,
  marketId: bigint,
  timeoutMs = 10 * 60 * 1000 // 10 minutes
): Promise<{ outcome: number; confidence: number }> {
  log("WAIT", `Watching for MarketSettled event on market #${marketId}…`);

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      unwatch();
      reject(new Error("Timed out waiting for settlement after 10 minutes"));
    }, timeoutMs);

    const unwatch = publicClient.watchContractEvent({
      address:   MARKET_ADDRESS,
      abi:       ABI,
      eventName: "MarketSettled",
      onLogs: (logs) => {
        for (const log of logs) {
          if (log.args.marketId === marketId) {
            clearTimeout(timer);
            unwatch();
            resolve({
              outcome:    Number(log.args.outcome),
              confidence: Number(log.args.confidence),
            });
          }
        }
      },
      onError: async () => {
        // Fallback to polling if event watching fails
        clearTimeout(timer);
        unwatch();
        log("WAIT", "Event watching failed — falling back to polling every 10s");
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
          await sleep(10_000);
          const market = await publicClient.readContract({
            address:      MARKET_ADDRESS,
            abi:          ABI,
            functionName: "getMarket",
            args:         [marketId],
          }) as any;
          if (market.settled) {
            resolve({ outcome: Number(market.outcome), confidence: Number(market.confidence) });
            return;
          }
          log("WAIT", "Not settled yet — polling again in 10s…");
        }
        reject(new Error("Timed out waiting for settlement"));
      },
    });
  });
}

// ── Main agent ────────────────────────────────────────────────────────────────
async function main() {
  if (!PRIVATE_KEY || !MARKET_ADDRESS) {
    throw new Error("Missing PRIVATE_KEY or MARKET_ADDRESS in .env");
  }

  const account = privateKeyToAccount(PRIVATE_KEY);

  const publicClient = createPublicClient({
    chain:     sepolia,
    transport: http(RPC_URL),
  });

  const walletClient = createWalletClient({
    account,
    chain:     sepolia,
    transport: http(RPC_URL),
  });

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Rev Markets — Autonomous Agent");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  Wallet : ${account.address}`);
  console.log(`  Contract: ${MARKET_ADDRESS}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // ── Step 1: Create market ──────────────────────────────────────────────────
  log("1/5", "Creating market…");

  const question = `Will ETH be above $2000 on ${new Date().toISOString().split("T")[0]}?`;
  log("1/5", `Question: "${question}"`);

  const nextId = await publicClient.readContract({
    address:      MARKET_ADDRESS,
    abi:          ABI,
    functionName: "getNextMarketId",
  }) as bigint;

  const createHash = await walletClient.writeContract({
    address:      MARKET_ADDRESS,
    abi:          ABI,
    functionName: "createMarket",
    args:         [question, ""],
  });

  log("1/5", `Tx sent: ${createHash}`);
  await publicClient.waitForTransactionReceipt({ hash: createHash });

  const marketId = nextId;
  log("1/5", `✓ Market #${marketId} created`);

  // ── Step 2: Place prediction ───────────────────────────────────────────────
  log("2/5", `Placing YES prediction on market #${marketId}…`);

  const predictHash = await walletClient.writeContract({
    address:      MARKET_ADDRESS,
    abi:          ABI,
    functionName: "predict",
    args:         [marketId, 0], // 0 = YES
    value:        parseEther("0.001"),
  });

  log("2/5", `Tx sent: ${predictHash}`);
  await publicClient.waitForTransactionReceipt({ hash: predictHash });
  log("2/5", `✓ Predicted YES · staked 0.001 ETH`);

  // ── Step 3: Request settlement ─────────────────────────────────────────────
  log("3/5", `Requesting AI settlement for market #${marketId}…`);

  const settleHash = await walletClient.writeContract({
    address:      MARKET_ADDRESS,
    abi:          ABI,
    functionName: "requestSettlement",
    args:         [marketId],
  });

  log("3/5", `Tx sent: ${settleHash}`);
  await publicClient.waitForTransactionReceipt({ hash: settleHash });
  log("3/5", `✓ Settlement requested — CRE + Gemini AI processing…`);

  // ── Step 4: Wait for CRE to settle ────────────────────────────────────────
  log("4/5", "Waiting for Chainlink CRE to write result on-chain…");

  const { outcome, confidence } = await waitForSettlement(publicClient, marketId);
  const outcomeLabel = outcome === 0 ? "YES" : "NO";
  log("4/5", `✓ Market settled — Outcome: ${outcomeLabel} · Confidence: ${confidence / 100}%`);

  // ── Step 5: Claim winnings (if agent won) ──────────────────────────────────
  log("5/5", "Checking if agent won…");

  const position = await publicClient.readContract({
    address:      MARKET_ADDRESS,
    abi:          ABI,
    functionName: "getPrediction",
    args:         [marketId, account.address],
  }) as any;

  const agentPrediction = Number(position.prediction);
  const agentWon        = agentPrediction === outcome && !position.claimed;

  if (agentWon) {
    log("5/5", `Agent predicted ${agentPrediction === 0 ? "YES" : "NO"} and WON — claiming…`);

    const claimHash = await walletClient.writeContract({
      address:      MARKET_ADDRESS,
      abi:          ABI,
      functionName: "claim",
      args:         [marketId],
    });

    log("5/5", `Tx sent: ${claimHash}`);
    await publicClient.waitForTransactionReceipt({ hash: claimHash });
    log("5/5", `✓ Winnings claimed successfully`);
  } else if (position.claimed) {
    log("5/5", "Position already claimed.");
  } else {
    log("5/5", `Agent predicted ${agentPrediction === 0 ? "YES" : "NO"} but outcome was ${outcomeLabel} — no claim.`);
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Agent lifecycle complete");
  console.log(`  Market #${marketId} · ${question}`);
  console.log(`  Outcome: ${outcomeLabel} · Confidence: ${confidence / 100}%`);
  console.log(`  Agent won: ${agentWon ? "YES 🏆" : "NO"}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main().catch(err => {
  console.error("\n[ERROR]", err.message);
  process.exit(1);
});
