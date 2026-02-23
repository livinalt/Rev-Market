import { cre, Runner, type Runtime, getNetwork } from "@chainlink/cre-sdk";
import { onHttpTrigger } from "./httpCallback";
import { onLogTrigger } from "./logCallback";
import { keccak256 as viem_keccak256 } from "viem";

type Config = {
  geminiModel: string;
  evms: Array<{
    marketAddress: string;
    chainSelectorName: string;
    gasLimit: string;
  }>;
};

const initWorkflow = (config: Config) => {
  // HTTP trigger (empty {} is fine for local sim/testing)
  const httpCapability = new cre.capabilities.HTTPCapability();
  const httpTrigger = httpCapability.trigger({});

  // ── EVM Log Trigger ──────────────────────────────────────────────

  const evmConfig = config.evms[0];  // or loop over config.evms if multiple

  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: evmConfig.chainSelectorName,
    isTestnet: true,  // flip to false for mainnet chains
  });

  if (!network) {
    throw new Error(`Network not found for ${evmConfig.chainSelectorName}`);
  }

  // This is the correct instantiation
  const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector);

  // Compute the event sig hash (keccak256)
  const eventSigHash = keccak256(
    toBytes("SettlementRequested(uint256,string)")
  );

  // This returns the trigger object — NOT a new class!
  const evmLogTrigger = evmClient.logTrigger({
    addresses: [hexToBase64(evmConfig.marketAddress)],
    topics: [
      { values: [hexToBase64(eventSigHash)] },  // topic0 = event sig
      {},                                       // topic1 = any (uint256)
      {},                                       // topic2 = any (string)
      {},                                       // topic3 = unused
    ],
    // Optional: confidence: "safe" | "finalized" | "latest" (default safe)
  });

  return [
    cre.handler(httpTrigger, onHttpTrigger),
    cre.handler(evmLogTrigger, onLogTrigger),
  ];
};

export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}

main();

function keccak256(data: Uint8Array): string {
  return viem_keccak256(data);
}
function hexToBase64(hex: string): string {
  const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
  return Buffer.from(cleanHex, "hex").toString("base64");
}
function toBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}