import {
  cre,
  type Runtime,
  type HTTPPayload,
  getNetwork,
  bytesToHex,
  hexToBase64,
  TxStatus,
  decodeJson,
} from "@chainlink/cre-sdk";
import { encodeAbiParameters, parseAbiParameters } from "viem";

interface CreateMarketPayload {
  question: string;
}

type Config = {
  geminiModel: string;
  evms: Array<{
    marketAddress: string;
    chainSelectorName: string;
    gasLimit: string;
  }>;
};

const CREATE_MARKET_PARAMS = parseAbiParameters("string question");

export function onHttpTrigger(runtime: Runtime<Config>, payload: HTTPPayload): string {
  runtime.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  runtime.log("CRE Workflow: HTTP Trigger - Create Market");
  runtime.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    if (!payload.input || payload.input.length === 0) {
      return "Error: Empty request";
    }

    const inputData = decodeJson(payload.input) as CreateMarketPayload;
    runtime.log(`[Step 1] Question: "${inputData.question}"`);

    if (!inputData.question?.trim()) return "Error: Question required";

    const evmConfig = runtime.config.evms[0];
    const network = getNetwork({
      chainFamily: "evm",
      chainSelectorName: evmConfig.chainSelectorName,
      isTestnet: true,
    });

    if (!network) throw new Error(`Unknown chain: ${evmConfig.chainSelectorName}`);

    runtime.log(`[Step 2] Contract: ${evmConfig.marketAddress}`);

    const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector);
    const reportData = encodeAbiParameters(CREATE_MARKET_PARAMS, [inputData.question]);

    runtime.log("[Step 3] Generating report...");
    const reportResponse = runtime.report({
      encodedPayload: hexToBase64(reportData),
      encoderName: "evm",
      signingAlgo: "ecdsa",
      hashingAlgo: "keccak256",
    }).result();

    runtime.log("[Step 4] Writing to chain...");
    const writeResult = evmClient.writeReport(runtime, {
      receiver: evmConfig.marketAddress,
      report: reportResponse,
      gasConfig: { gasLimit: evmConfig.gasLimit },
    }).result();

    if (writeResult.txStatus === TxStatus.SUCCESS) {
      const txHash = bytesToHex(writeResult.txHash || new Uint8Array(32));
      runtime.log(`[Step 5] ✓ Market created: ${txHash}`);
      return txHash;
    }

    throw new Error(`Failed: ${writeResult.txStatus}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    runtime.log(`[ERROR] ${msg}`);
    throw err;
  }
}