import "dotenv/config";

export const mnemonic: any = process.env.MNEMONIC;
export const privateKey: any = process.env.PRIVATE_KEY;
export const infuraId: string = process.env.INFURA_ID || "";
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
  kovan: {
    url: process.env.KOVAN_URL || "",
    miner: "0x9Ae895b0C267A4d7fd049c95C522Be99FbaEa6De",
    uniswap_v2_router_02: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    aggregatorV3ETHUSD: "0x9326BFA02ADD2366b30bacB125260Af641031331",
  },
  hardhat: {
    url: process.env.MAINNET_URL || "",
    miner: "0xC9CC2cF97A3a21Fcd337658F6898A7860521A819",
    uniswap_v2_router_02: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    aggregatorV3ETHUSD: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
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
    dai: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    usdc: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    wbtc: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    renbtc: "0xEB4C2781e4ebA804CE9a9803C67d0893436bB27D",
  },
  aggregatorV3ETHUSD: networkConfig.hardhat.aggregatorV3ETHUSD,
};
