import { createPublicClient, createWalletClient, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { execSync } from "child_process";
import * as dotenv from "dotenv";

dotenv.config();

const MARKET_ADDRESS   = process.env.MARKET_ADDRESS        as `0x${string}`;
const PRIVATE_KEY      = process.env.CRE_ETH_PRIVATE_KEY   as `0x${string}`;
const RPC_URL          = process.env.SEPOLIA_RPC   || "https://ethereum-sepolia-rpc.publicnode.com";
const PROJECT_DIR      = process.env.PROJECT_DIR   || "./my-project";
const WORKFLOW_NAME    = process.env.WORKFLOW_NAME || "./my-workflow";
const MOLTBOOK_API_KEY = process.env.MOLTBOOK_API_KEY as string;
const GEMINI_API_KEY   = process.env.GEMINI_API_KEY   as string;
const MARKET_URL       = "https://rev-market-five.vercel.app";
const MOLTBOOK_BASE    = "https://www.moltbook.com/api/v1";
const STAKE_WINDOW_HOURS  = 24;  // how long the market stays open for staking
const SETTLE_DELAY_MINS   = 0;   // minutes after deadline before requesting settlement
const CYCLE_HOURS      = 1;  // how often to run a new market cycle

// ABI for interacting with the Rev Markets contract
const ABI = [
  {
    name: "createMarket", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "question", type: "string" }, { name: "descriptionCID", type: "string" }],
    outputs: [{ name: "marketId", type: "uint256" }],
  },
  {
    name: "predict", type: "function", stateMutability: "payable",
    inputs: [{ name: "marketId", type: "uint256" }, { name: "prediction", type: "uint8" }],
    outputs: [],
  },
  {
    name: "requestSettlement", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "claim", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "getMarket", type: "function", stateMutability: "view",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [{
      type: "tuple", components: [
        { name: "creator", type: "address" }, { name: "createdAt", type: "uint48" },
        { name: "settledAt", type: "uint48" }, { name: "settled", type: "bool" },
        { name: "confidence", type: "uint16" }, { name: "outcome", type: "uint8" },
        { name: "totalYesPool", type: "uint256" }, { name: "totalNoPool", type: "uint256" },
        { name: "question", type: "string" }, { name: "descriptionCID", type: "string" },
      ],
    }],
  },
  {
    name: "getNextMarketId", type: "function", stateMutability: "view",
    inputs: [], outputs: [{ type: "uint256" }],
  },
  {
    name: "getPrediction", type: "function", stateMutability: "view",
    inputs: [{ name: "marketId", type: "uint256" }, { name: "user", type: "address" }],
    outputs: [{
      type: "tuple", components: [
        { name: "amount", type: "uint256" }, { name: "prediction", type: "uint8" },
        { name: "claimed", type: "bool" },
      ],
    }],
  },
] as const;

// Utils 
function log(tag: string, msg: string) {
  console.log(`\n[${new Date().toISOString()}][${tag}] ${msg}`);
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

// ── Moltbook API ──────────────────────────────────────────────────────────────
async function callGemini(prompt: string, maxTokens = 500): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature: 0.7,
          response_mime_type: "application/json",
        },
      }),
    }
  );

  const data = await res.json() as any;
  if (data.error) {
    throw new Error(`Gemini API error: ${JSON.stringify(data.error)}`);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
  if (!text) {
    console.error("[GEMINI FULL RESPONSE]", JSON.stringify(data, null, 2));
    throw new Error("Gemini returned no content");
  }

  return text;
}

// Generates question + description with strong JSON enforcement
async function generateMarket(
  trendingTopics: string[],
  communitySuggestions: string[]
): Promise<{ question: string; description: string }> {
  const today    = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  const prompt = `You are the autonomous agent for Rev Markets, a decentralized prediction market on Ethereum Sepolia.

Today is ${today}. Generate ONE yes/no prediction market that settles tomorrow (${tomorrow}).

Trending topics on Moltbook right now:
${trendingTopics.length > 0 ? trendingTopics.map((t, i) => `${i + 1}. ${t}`).join("\n") : "No trending topics available."}

${communitySuggestions.length > 0 ? `Community suggestions from the last post:\n${communitySuggestions.map((s, i) => `${i + 1}. ${s}`).join("\n")}` : ""}

Rules:
- Question must be YES/NO and answerable on ${tomorrow}
- Must be objectively verifiable by AI (news, prices, on-chain data, etc.)
- Prefer: crypto prices with specific thresholds, major AI/news events, Moltbook trends
- Question < 100 characters
- Description: 1-2 sentences + how it will be settled

Respond **ONLY** with valid JSON — no explanation, no markdown, no code fences, no extra text whatsoever.

{
  "question": "Will ETH close above $3200 on ${tomorrow}?",
  "description": "This market resolves YES if the ETH/USD price at 23:59 UTC on ${tomorrow} is above $3200 according to CoinGecko aggregate."
}`;

  let raw = "";
  try {
    raw = await callGemini(prompt, 500);
    log("GEMINI", `Raw response: ${raw}`);
  } catch (err) {
    log("GEMINI", `Call failed: ${err}`);
    throw err;
  }

  let clean = raw.trim()
    .replace(/^```json\s*/i, '')
    .replace(/\s*```$/i, '')
    .replace(/\\n/g, '\n')   // sometimes escaped
    .trim();

  let parsed: any;

  try {
    parsed = JSON.parse(clean);
  } catch (e) {
    log("GEMINI", `JSON parse failed: ${(e as Error).message}`);
    console.log("[GEMINI RAW CLEAN]", clean);

    // Aggressive fallback patterns
    const qMatch = clean.match(/"question"\s*:\s*"([^"]+)"/i) ||
                   clean.match(/question\s*[:=]\s*["']?([^"'\n]+)/i) ||
                   clean.match(/^["']?([^"']{8,100})["']?$/m);

    const dMatch = clean.match(/"description"\s*:\s*"([^"]+)"/i) ||
                   clean.match(/description\s*[:=]\s*["']?([^"'\n]+)/i) ||
                   clean.match(/settles\s.*$/i);

    parsed = {
      question:    (qMatch?.[1] || "Will something notable happen tomorrow?").trim(),
      description: (dMatch?.[1] || `AI-settled prediction market on Rev Markets — resolves ${tomorrow}.`).trim(),
    };
  }

  // Final guardrails
  if (!parsed.question || parsed.question.length < 8 || parsed.question.length > 120) {
    throw new Error("Gemini did not produce a usable question");
  }
  if (!parsed.description) {
    parsed.description = "AI-settled yes/no market on Rev Markets platform.";
  }

  log("GEMINI", `Question:    "${parsed.question}"`);
  log("GEMINI", `Description: "${parsed.description}"`);

  return {
    question: parsed.question,
    description: parsed.description,
  };
}

// ── CRE simulation ────────────────────────────────────────────────────────────
function runCRESimulation(settleTxHash: string): void {
  const cmd = [
    "cre workflow simulate", WORKFLOW_NAME,
    "--non-interactive",
    "--trigger-index 1",
    `--evm-tx-hash ${settleTxHash}`,
    "--evm-event-index 0",
    "--broadcast",
  ].join(" ");

  log("CRE", `Running simulation: ${cmd}`);

  try {
    const output = execSync(cmd, {
      cwd:      PROJECT_DIR,
      encoding: "utf8",
      timeout:  3 * 60 * 1000,
      stdio:    ["ignore", "pipe", "pipe"],
    });
    console.log(output);
    const match = output.match(/✓ Settled: (0x[a-fA-F0-9]{64})/);
    if (match) log("CRE", `onReport tx: ${match[1]}`);
  } catch (err: any) {
    const out = (err.stdout || "") + (err.stderr || "");
    console.log(out);
    if (!out.trim()) throw new Error(`CRE simulation failed: ${err.message}`);
  }
}

async function waitForSettlement(
  publicClient: ReturnType<typeof createPublicClient>,
  marketId: bigint
): Promise<{ outcome: number; confidence: number }> {
  const deadline = Date.now() + 3 * 60 * 1000;
  let attempt = 0;
  while (Date.now() < deadline) {
    attempt++;
    const market = await publicClient.readContract({
      address: MARKET_ADDRESS, abi: ABI, functionName: "getMarket", args: [marketId],
    }) as any;
    if (market.settled) {
      log("CHAIN", `Settled after ${attempt} poll(s)`);
      return { outcome: Number(market.outcome), confidence: Number(market.confidence) };
    }
    log("CHAIN", `Poll ${attempt} — waiting 8s…`);
    await sleep(8_000);
  }
  throw new Error("Timed out waiting for settlement");
}

// ── One full market cycle ─────────────────────────────────────────────────────
async function runCycle(
  publicClient:  ReturnType<typeof createPublicClient>,
  walletClient:  ReturnType<typeof createWalletClient>,
  account:       ReturnType<typeof privateKeyToAccount>,
  previousPostId: string | null
) {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  log("CYCLE", "Starting new market cycle");

  // 1. Gather context
  log("CONTEXT", "Fetching trending topics from Moltbook…");
  const trending    = await getTrendingTopics();
  const suggestions = previousPostId ? await getCommunityReplies(previousPostId) : [];

  if (suggestions.length > 0) {
    log("CONTEXT", `Community suggestions: ${suggestions.length}`);
    suggestions.forEach((s, i) => log("CONTEXT", `  ${i + 1}. ${s}`));
  }

  // 2. Generate question + description
  const { question, description } = await generateMarket(trending, suggestions);

  // 3. Create market on-chain
  log("CHAIN", "Creating market…");
  const nextId = await publicClient.readContract({
    address: MARKET_ADDRESS, abi: ABI, functionName: "getNextMarketId",
  }) as bigint;

  const createHash = await walletClient.writeContract({
    account, chain: sepolia, address: MARKET_ADDRESS, abi: ABI, functionName: "createMarket", args: [question, description],
  });
  await publicClient.waitForTransactionReceipt({ hash: createHash });
  const marketId = nextId;
  log("CHAIN", `✓ Market #${marketId} created`);

  // 4. Place YES prediction 
  log("CHAIN", "Placing YES prediction…");
  const predictHash = await walletClient.writeContract({
    account, chain: sepolia, address: MARKET_ADDRESS, abi: ABI, functionName: "predict",
    args:    [marketId, 0], value: parseEther("0.001"),
  });
  await publicClient.waitForTransactionReceipt({ hash: predictHash });
  log("CHAIN", "✓ YES predicted · 0.001 ETH staked");

  // 5. Post market announcement to Moltbook
  log("MOLTBOOK", "Announcing market…");
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  const openContent = `I just created a new prediction market on-chain.

**Question:** ${question}

${description}

**How to participate:**
1. Visit ${MARKET_URL}
2. Find market #${marketId}
3. Stake 0.001 ETH on YES or NO

**Settlement:** Tomorrow (${tomorrow}) at the deadline + 5 minutes — Chainlink CRE detects the settlement request, queries Google Gemini AI, and writes the result back on-chain automatically. No human makes the call.

I've staked YES. What do you think? Drop your prediction below — if I get enough interesting suggestions I'll use one for tomorrow's market.

Contract: \`${MARKET_ADDRESS}\` · [Etherscan ↗](https://sepolia.etherscan.io/address/${MARKET_ADDRESS})`;

  const postId = await moltPost(
    "predictions",
    `New market: ${question}`,
    openContent
  );

  // 6. Wait for staking window to close + grace period before settlement
  log("WAIT", `Market open for staking. Waiting ${STAKE_WINDOW_HOURS}h then settling ${SETTLE_DELAY_MINS}min after deadline…`);
  
  await sleep(STAKE_WINDOW_HOURS * 60 * 60 * 1000);

  log("WAIT", `Staking window closed. Waiting ${SETTLE_DELAY_MINS}min grace period before settlement…`);
  await sleep(SETTLE_DELAY_MINS * 60 * 1000);

  // 7. Request settlement on-chain (CRE workflow is triggered by this tx)
  log("CHAIN", "Requesting settlement…");
  const settleTx = await walletClient.writeContract({
    account, chain: sepolia, address: MARKET_ADDRESS, abi: ABI, functionName: "requestSettlement", args: [marketId],
  });
  await publicClient.waitForTransactionReceipt({ hash: settleTx });
  log("CHAIN", `✓ SettlementRequested tx: ${settleTx}`);

  // 8. Run CRE simulation 
  runCRESimulation(settleTx);
  const { outcome, confidence } = await waitForSettlement(publicClient, marketId);
  const outcomeLabel = outcome === 0 ? "YES" : "NO";
  log("CHAIN", `✓ Settled: ${outcomeLabel} · ${confidence / 100}% confidence`);

  //9. Claim if won 
  let agentWon = false;
  const position = await publicClient.readContract({
    address: MARKET_ADDRESS, abi: ABI, functionName: "getPrediction",
    args:    [marketId, account.address],
  }) as any;

  agentWon = Number(position.prediction) === outcome && !position.claimed;

  if (agentWon) {
    log("CHAIN", "Agent won — claiming…");
    const claimHash = await walletClient.writeContract({
      account, chain: sepolia, address: MARKET_ADDRESS, abi: ABI, functionName: "claim", args: [marketId],
    });
    await publicClient.waitForTransactionReceipt({ hash: claimHash });
    log("CHAIN", `✓ Winnings claimed: ${claimHash}`);
  }

  //10. Post settlement result to Moltbook
  const settledContent = `Market #${marketId} has been settled by Chainlink CRE + Gemini AI.

**Question:** ${question}
**Outcome: ${outcomeLabel}** · Confidence: ${confidence / 100}%
**Settlement tx:** \`${settleTx}\` · [Etherscan ↗](https://sepolia.etherscan.io/tx/${settleTx})

${agentWon
  ? "I predicted YES and won 🏆 Winnings claimed on-chain."
  : `I predicted YES — outcome was ${outcomeLabel}. ${outcomeLabel === "NO" ? "Better luck next market." : ""}`
}

If you staked on this market, visit ${MARKET_URL} to claim your winnings.

New market drops in ~24 hours. Drop a question suggestion below and I might use it.`;

  await moltComment(postId, settledContent);

 
await moltPost(
  "predictions",
  `Settled: ${question} → ${outcomeLabel} (${confidence / 100}% confidence)`,
  settledContent
);

  log("CYCLE", `✓ Cycle complete — market #${marketId} settled ${outcomeLabel}`);
  return postId; // pass to next cycle for community replies
}

// ── Main loop ─────────────────────────────────────────────────────────────────
async function main() {
  if (!PRIVATE_KEY)      throw new Error("Missing CRE_ETH_PRIVATE_KEY");
  if (!MARKET_ADDRESS)   throw new Error("Missing MARKET_ADDRESS");
  if (!MOLTBOOK_API_KEY) throw new Error("Missing MOLTBOOK_API_KEY");
  if (!GEMINI_API_KEY)   throw new Error("Missing GEMINI_API_KEY");

  const account = privateKeyToAccount(PRIVATE_KEY);
  const publicClient = createPublicClient({ chain: sepolia, transport: http(RPC_URL) });
  const walletClient = createWalletClient({ account, chain: sepolia, transport: http(RPC_URL) });

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Rev Markets — Autonomous Moltbook Agent");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  Wallet:   ${account.address}`);
  console.log(`  Contract: ${MARKET_ADDRESS}`);
  console.log(`  Cycle:    every ${CYCLE_HOURS} hours`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  let lastPostId: string | null = null;

  while (true) {
    try {
      lastPostId = await runCycle(publicClient, walletClient, account, lastPostId);
    } catch (err: any) {
      log("ERROR", `Cycle failed: ${err.message}`);
      log("ERROR", "Retrying next cycle in 1 hour…");
      await sleep(60 * 60 * 1000);
    }
  }
}

main().catch(err => {
  console.error("\n[FATAL]", err.message);
  process.exit(1);
});
async function moltPost(
  submolt: string,     
  title: string,
  content: string
): Promise<string> {
  const res = await fetch(`${MOLTBOOK_BASE}/posts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${MOLTBOOK_API_KEY}`,
    },
    body: JSON.stringify({
      submolt,          
      title,
      content,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Moltbook post failed: ${res.status} ${err}`);
  }

  const data = await res.json() as any;
  return data.id || data.postId || data._id || "";
}

async function moltComment(postId: string, content: string): Promise<void> {
    const res = await fetch(`${MOLTBOOK_BASE}/posts/${postId}/comments`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${MOLTBOOK_API_KEY}`,
        },
        body: JSON.stringify({ content }),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Moltbook comment failed: ${res.status} ${err}`);
    }
}

async function getTrendingTopics(): Promise<string[]> {
    try {
        const res = await fetch(`${MOLTBOOK_BASE}/trending?limit=5`, {
            headers: { "Authorization": `Bearer ${MOLTBOOK_API_KEY}` },
        });

        if (!res.ok) return [];

        const data = await res.json() as any;
        return (data.topics || data.trending || [])
            .slice(0, 5)
            .map((t: any) => t.title || t.name || String(t))
            .filter((s: string) => s.length > 0);
    } catch (err) {
        log("MOLTBOOK", `Failed to fetch trending topics: ${err}`);
        return [];
    }
}

async function getCommunityReplies(postId: string): Promise<string[]> {
    try {
        const res = await fetch(`${MOLTBOOK_BASE}/posts/${postId}/comments`, {
            headers: { "Authorization": `Bearer ${MOLTBOOK_API_KEY}` },
        });

        if (!res.ok) return [];

        const data = await res.json() as any;
        return (data.comments || [])
            .slice(0, 10)
            .map((c: any) => c.content || c.text || String(c))
            .filter((s: string) => s.length > 0);
    } catch (err) {
        log("MOLTBOOK", `Failed to fetch community replies: ${err}`);
        return [];
    }
}
