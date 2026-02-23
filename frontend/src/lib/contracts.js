export const MARKET_ADDRESS = "0xf34c4C6eE65ddbD0C71D4313B774726b280590e9";
export const CLIENT_ID      = "54ffb4fd22a8acbf17aa4797d0468008";

export const MARKET_ABI = [
  // ── Read ──────────────────────────────────────────────────────
  {
    name: "getMarket", type: "function", stateMutability: "view",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [{
      name: "", type: "tuple",
      components: [
        { name: "creator",      type: "address" },
        { name: "createdAt",    type: "uint48"  },
        { name: "settledAt",    type: "uint48"  },
        { name: "settled",      type: "bool"    },
        { name: "confidence",   type: "uint16"  },
        { name: "outcome",      type: "uint8"   },
        { name: "totalYesPool", type: "uint256" },
        { name: "totalNoPool",  type: "uint256" },
        { name: "question",     type: "string"  },
      ]
    }]
  },
  {
    name: "getPrediction", type: "function", stateMutability: "view",
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "user",     type: "address" }
    ],
    outputs: [{
      name: "", type: "tuple",
      components: [
        { name: "amount",     type: "uint256" },
        { name: "prediction", type: "uint8"   },
        { name: "claimed",    type: "bool"    },
      ]
    }]
  },
  {
    name: "getNextMarketId", type: "function", stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "uint256" }]
  },

  // ── Write ─────────────────────────────────────────────────────
  {
    name: "createMarket", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "question", type: "string" }],
    outputs: [{ name: "marketId", type: "uint256" }]
  },
  {
    name: "predict", type: "function", stateMutability: "payable",
    inputs: [
      { name: "marketId",   type: "uint256" },
      { name: "prediction", type: "uint8"   }
    ],
    outputs: []
  },
  {
    name: "requestSettlement", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: []
  },
  {
    name: "claim", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: []
  },

  // ── Events ────────────────────────────────────────────────────
  {
    name: "MarketCreated", type: "event",
    inputs: [
      { name: "marketId", type: "uint256", indexed: true },
      { name: "question", type: "string",  indexed: false },
      { name: "creator",  type: "address", indexed: false },
    ]
  },
  {
    name: "SettlementRequested", type: "event",
    inputs: [
      { name: "marketId", type: "uint256", indexed: true },
      { name: "question", type: "string",  indexed: false },
    ]
  },
  {
    name: "MarketSettled", type: "event",
    inputs: [
      { name: "marketId",   type: "uint256", indexed: true  },
      { name: "outcome",    type: "uint8",   indexed: false },
      { name: "confidence", type: "uint16",  indexed: false },
    ]
  },
  {
    name: "WinningsClaimed", type: "event",
    inputs: [
      { name: "marketId", type: "uint256", indexed: true  },
      { name: "claimer",  type: "address", indexed: true  },
      { name: "amount",   type: "uint256", indexed: false },
    ]
  },
];