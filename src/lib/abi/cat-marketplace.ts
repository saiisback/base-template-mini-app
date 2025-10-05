export const catMarketplaceAbi = [
  {
    inputs: [],
    name: "purchase",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "newPrice",
        type: "uint256",
      },
    ],
    name: "relist",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "getItem",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "id", type: "uint256" },
          { internalType: "string", name: "name", type: "string" },
          { internalType: "string", name: "metadataURI", type: "string" },
          { internalType: "uint256", name: "price", type: "uint256" },
          { internalType: "address", name: "seller", type: "address" },
          { internalType: "bool", name: "available", type: "bool" },
        ],
        internalType: "struct CatMarketplace.Item",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

