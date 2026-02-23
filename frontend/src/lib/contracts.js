export const PM_ADDRESS  = "0xD8846806e200604428E6c40f6c3ed6B80c3a70DF";
export const SE_ADDRESS  = "0xA32d2AD94b9C1795d44385F16Bf5366131e0F362";
export const EM_ADDRESS  = "0xE6B57AAfA330D6d51058Ddbfe2e16A2F60951a69";
export const ESE_ADDRESS = "0x1769eC29AE46BB2EC2CFB002e9E7b368d95E377E";
export const CLIENT_ID   = "54ffb4fd22a8acbf17aa4797d0468008";

export const PM_ABI = [
  { name: "markets", type: "function", stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [
      { name: "strikePrice",  type: "uint256" },
      { name: "expiry",       type: "uint256" },
      { name: "totalAbove",   type: "uint256" },
      { name: "totalBelow",   type: "uint256" },
      { name: "settledPrice", type: "uint256" },
      { name: "state",        type: "uint8"   }
    ]
  },
  { name: "takePosition", type: "function", stateMutability: "payable",
    inputs: [{ name: "marketId", type: "uint256" }, { name: "side", type: "uint8" }],
    outputs: []
  },
  { name: "nextMarketId", type: "function", stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "uint256" }]
  },
  { name: "claim", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "marketId", type: "uint256" }], outputs: []
  },
  { name: "positions", type: "function", stateMutability: "view",
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "user",     type: "address"  },
      { name: "side",     type: "uint8"    }
    ],
    outputs: [{ name: "", type: "uint256" }]
  },
  { name: "createMarket", type: "function", stateMutability: "nonpayable",
    inputs: [
      { name: "strike", type: "uint256" },
      { name: "expiry", type: "uint256" }
    ],
    outputs: [{ name: "id", type: "uint256" }]
  }
];

export const EM_ABI = [
  { name: "markets", type: "function", stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [
      { name: "questionId",   type: "bytes32" },
      { name: "questionText", type: "string"  },
      { name: "expiry",       type: "uint256" },
      { name: "totalYes",     type: "uint256" },
      { name: "totalNo",      type: "uint256" },
      { name: "outcome",      type: "uint8"   }
    ]
  },
  { name: "takePosition", type: "function", stateMutability: "payable",
    inputs: [{ name: "marketId", type: "uint256" }, { name: "side", type: "uint8" }],
    outputs: []
  },
  { name: "nextMarketId", type: "function", stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "uint256" }]
  },
  { name: "claim", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "marketId", type: "uint256" }], outputs: []
  },
  { name: "claimRefund", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "marketId", type: "uint256" }], outputs: []
  },
  { name: "positions", type: "function", stateMutability: "view",
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "user",     type: "address"  },
      { name: "side",     type: "uint8"    }
    ],
    outputs: [{ name: "", type: "uint256" }]
  },
  { name: "createMarket", type: "function", stateMutability: "nonpayable",
    inputs: [
      { name: "questionText", type: "string"  },
      { name: "expiry",       type: "uint256" }
    ],
    outputs: [{ name: "id", type: "uint256" }]
  }
];
