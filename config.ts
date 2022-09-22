import "dotenv/config";

// some chains do not have enough liquidity. Set this value lower if
// transferFrom is throwing errors.
export const FIXED_MINER_OUT: string = "0.001";

export const mnemonic: any = process.env.MNEMONIC;
export const privateKey: any = process.env.PRIVATE_KEY;
export const reportGas: any = true;
export const etherscanAPIKey: any = process.env.REPORT_GAS;
export const developmentChains: string[] = ["hardhat", "localhost"];

export interface networkConfigItem {
  url: string;
  miner: string;
  uniswap_v2_router_02: string;
  aggregatorV3ETHUSD: string;
}

export interface networkConfigInfo {
  [key: string]: networkConfigItem;
}

export const networkConfig: networkConfigInfo = {
  goerli: {
    url: process.env.TESTNET_URL || "",
    miner: "0xe126BdBe97D8214fA403b8C718C1D873E950408D",
    uniswap_v2_router_02: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    aggregatorV3ETHUSD: "0x8A753747A1Fa494EC906cE90E9f37563A8AF630e",
  },
  hardhat: {
    // url: process.env.MAINNET_URL || "",
    // miner: "0xC9CC2cF97A3a21Fcd337658F6898A7860521A819",
    uniswap_v2_router_02: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    // aggregatorV3ETHUSD: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
    url: process.env.TESTNET_URL || "",
    miner: "0xe126BdBe97D8214fA403b8C718C1D873E950408D",
    aggregatorV3ETHUSD: "0x8A753747A1Fa494EC906cE90E9f37563A8AF630e",
  },
};

export interface testConfigInfo {
  miner: string;
  uniswapV2Router02: string;
  currencies: { [name: string]: string };
  aggregatorV3ETHUSD: string;
}

export const testConfig: testConfigInfo = {
  miner: networkConfig.hardhat.miner,
  uniswapV2Router02: networkConfig.hardhat.uniswap_v2_router_02,
  currencies: {
    // dai: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    // usdc: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    // wbtc: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    // renbtc: "0xEB4C2781e4ebA804CE9a9803C67d0893436bB27D",
    dai: "0xc7AD46e0b8a400Bb3C915120d284AafbA8fc4735",
    usdc: "0xeb8f08a975Ab53E34D8a0330E0D34de942C95926",
    wbtc: "0x577D296678535e4903D59A4C929B718e1D575e0A",
    renbtc: "0xE09fac962aA9BCf5c21B1987396c8A7C16C82B11",
  },
  aggregatorV3ETHUSD: networkConfig.hardhat.aggregatorV3ETHUSD,
};
