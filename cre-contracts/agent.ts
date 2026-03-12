import { createPublicClient, createWalletClient, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { execSync } from "child_process";
import * as dotenv from "dotenv";

dotenv.config();

//  Config
const MARKET_ADDRESS = process.env.MARKET_ADDRESS      as `0x${string}`;
const PRIVATE_KEY    = process.env.CRE_ETH_PRIVATE_KEY as `0x${string}`;
const RPC_URL        = process.env.SEPOLIA_RPC  || "https://ethereum-sepolia-rpc.publicnode.com";
const PROJECT_DIR    = process.env.PROJECT_DIR  || "./my-project"; 
const WORKFLOW_NAME  = process.env.WORKFLOW_NAME || "./my-workflow"; 

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
    inputs:  [],
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
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────
function log(step: string, msg: string) {
  console.log(`\n[${step}] ${msg}`);
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


function runCRESimulation(settleTxHash: string): void {
  
  const cmd = [
    "cre workflow simulate", WORKFLOW_NAME,
    "--non-interactive",
    "--trigger-index 1",
    `--evm-tx-hash ${settleTxHash}`,
    "--evm-event-index 0",
    "--broadcast",
  ].join(" ");

  log("4/5 CRE", `Running: ${cmd}`);

  try {
    const output = execSync(cmd, {
      cwd:      PROJECT_DIR,
      encoding: "utf8",
      timeout:  3 * 60 * 1000, 
      stdio:    ["ignore", "pipe", "pipe"],
    });
    printSimOutput(output);
  } catch (err: any) {
    
    const combined = (err.stdout || "") + (err.stderr || "");
    printSimOutput(combined);
    if (!combined.trim()) {
      throw new Error(`CRE simulation failed with no output: ${err.message}`);
    }
  }
}

function printSimOutput(output: string): void {
  console.log("\n── CRE simulation output ──────────────────────────────────────");
  console.log(output.trim());
  console.log("───────────────────────────────────────────────────────────────");

  const match = output.match(/✓ Settled: (0x[a-fA-F0-9]{64})/);
  if (match) {
    console.log(`\n  ✓ onReport tx : ${match[1]}`);
    console.log(`  Etherscan    : https://sepolia.etherscan.io/tx/${match[1]}`);
  }
}

// Polls getMarket() every 8s until settled=true
async function waitForSettlement(
  publicClient: ReturnType<typeof createPublicClient>,
  marketId: bigint,
  timeoutMs = 3 * 60 * 1000
): Promise<{ outcome: number; confidence: number }> {
  log("4/5 CRE", `Confirming settlement on-chain for market #${marketId}…`);

  const deadline = Date.now() + timeoutMs;
  let attempt = 0;

  while (Date.now() < deadline) {
    attempt++;
    const market = await publicClient.readContract({
      address:      MARKET_ADDRESS,
      abi:          ABI,
      functionName: "getMarket",
      args:         [marketId],
    }) as any;

    if (market.settled) {
      log("4/5 CRE", `✓ Confirmed on-chain after ${attempt} poll(s)`);
      return { outcome: Number(market.outcome), confidence: Number(market.confidence) };
    }

    log("4/5 CRE", `Poll ${attempt} — not yet settled, retrying in 8s…`);
    await sleep(8_000);
  }

  throw new Error("Timed out waiting for settlement to confirm on-chain");
}

// 
async function main() {
  if (!PRIVATE_KEY)    throw new Error("Missing CRE_ETH_PRIVATE_KEY in .env");
  if (!MARKET_ADDRESS) throw new Error("Missing MARKET_ADDRESS in .env");

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

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Rev Markets — Autonomous Agent");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  Wallet:   ${account.address}`);
  console.log(`  Contract: ${MARKET_ADDRESS}`);
  console.log(`  Workflow: ${PROJECT_DIR}/${WORKFLOW_NAME}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // 1. Create market
  log("1/5 CREATE", "Creating market…");
  const question = `Will ETH close above $2000 on ${new Date().toISOString().split("T")[0]}?`;
  log("1/5 CREATE", `Question: "${question}"`);

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
  log("1/5 CREATE", `Tx: ${createHash}`);
  await publicClient.waitForTransactionReceipt({ hash: createHash });
  const marketId = nextId;
  log("1/5 CREATE", `✓ Market #${marketId} created`);

  // 2. Place prediction
  log("2/5 PREDICT", `Predicting YES on market #${marketId}…`);

  const predictHash = await walletClient.writeContract({
    address:      MARKET_ADDRESS,
    abi:          ABI,
    functionName: "predict",
    args:         [marketId, 0], // 0 = YES
    value:        parseEther("0.001"),
  });
  log("2/5 PREDICT", `Tx: ${predictHash}`);
  await publicClient.waitForTransactionReceipt({ hash: predictHash });
  log("2/5 PREDICT", `✓ YES predicted · 0.001 ETH staked`);

  // 3. Request settlement 
  log("3/5 REQUEST", `Requesting settlement for market #${marketId}…`);

  const settleTx = await walletClient.writeContract({
    address:      MARKET_ADDRESS,
    abi:          ABI,
    functionName: "requestSettlement",
    args:         [marketId],
  });
  log("3/5 REQUEST", `Tx: ${settleTx}`);
  await publicClient.waitForTransactionReceipt({ hash: settleTx });
  log("3/5 REQUEST", `✓ SettlementRequested emitted`);
  log("3/5 REQUEST", `  Etherscan: https://sepolia.etherscan.io/tx/${settleTx}`);

  // 4. CRE simulation 
  runCRESimulation(settleTx);
  const { outcome, confidence } = await waitForSettlement(publicClient, marketId);
  const outcomeLabel = outcome === 0 ? "YES" : "NO";
  log("4/5 CRE", `✓ Settled: ${outcomeLabel} · ${confidence / 100}% confidence`);

  // 5. Claim winnings
  log("5/5 CLAIM", "Checking agent position…");

  const position = await publicClient.readContract({
    address:      MARKET_ADDRESS,
    abi:          ABI,
    functionName: "getPrediction",
    args:         [marketId, account.address],
  }) as any;

  const agentPrediction = Number(position.prediction);
  const agentWon        = agentPrediction === outcome && !position.claimed;

  if (agentWon) {
    log("5/5 CLAIM", `Agent predicted ${agentPrediction === 0 ? "YES" : "NO"} — WON 🏆 Claiming…`);
    const claimHash = await walletClient.writeContract({
      address:      MARKET_ADDRESS,
      abi:          ABI,
      functionName: "claim",
      args:         [marketId],
    });
    log("5/5 CLAIM", `Tx: ${claimHash}`);
    await publicClient.waitForTransactionReceipt({ hash: claimHash });
    log("5/5 CLAIM", `✓ Winnings claimed`);
    log("5/5 CLAIM", `  Etherscan: https://sepolia.etherscan.io/tx/${claimHash}`);
  } else if (position.claimed) {
    log("5/5 CLAIM", "Already claimed.");
  } else {
    log("5/5 CLAIM", `Agent predicted ${agentPrediction === 0 ? "YES" : "NO"} — outcome was ${outcomeLabel}. No winnings.`);
  }

  // Summary 
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Agent lifecycle complete");
  console.log(`  Market   : #${marketId} — ${question}`);
  console.log(`  Outcome  : ${outcomeLabel} · ${confidence / 100}% confidence`);
  console.log(`  Agent won: ${agentWon ? "YES 🏆" : "NO"}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main().catch(err => {
  console.error("\n[ERROR]", err.message);
  process.exit(1);
});