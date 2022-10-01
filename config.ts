import "dotenv/config";

// some chains do not have enough liquidity. Set this value lower if
// transferFrom is throwing errors.
export const FIXED_MINER_OUT: string = "0.000000001";

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
  priceUSDMiner: string;
}

export interface networkConfigInfo {
  [key: string]: networkConfigItem;
}

export const networkConfig: networkConfigInfo = {
  goerli: {
    url: process.env.TESTNET_URL || "",
    miner: "0x20c23F279CCD0c804a9a89f78b57b3Ba2f4B1698",
    uniswap_v2_router_02: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    aggregatorV3ETHUSD: "0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e",
    priceUSDMiner: "0xEEE8B4522617FE2f992351CB7C34568A77042d1d",
  },
  hardhat: {
    // url: process.env.MAINNET_URL || "",
    // miner: "0xC9CC2cF97A3a21Fcd337658F6898A7860521A819",
    uniswap_v2_router_02: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    // aggregatorV3ETHUSD: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
    url: process.env.TESTNET_URL || "",
    miner: "0x20c23F279CCD0c804a9a89f78b57b3Ba2f4B1698",
    aggregatorV3ETHUSD: "0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e",
    priceUSDMiner: "0xEEE8B4522617FE2f992351CB7C34568A77042d1d",
  },
};

export interface testConfigInfo {
  miner: string;
  uniswapV2Router02: string;
  currencies: { [name: string]: string };
  aggregatorV3ETHUSD: string;
  priceUSDMiner: string;
  balances: { [name: string]: string };
}

export const testConfig: testConfigInfo = {
  miner: networkConfig.hardhat.miner,
  uniswapV2Router02: networkConfig.hardhat.uniswap_v2_router_02,
  currencies: {
    // dai: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    // usdc: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    // wbtc: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    // renbtc: "0xEB4C2781e4ebA804CE9a9803C67d0893436bB27D",
    dai: "0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60",
    usdc: "0xD87Ba7A50B2E7E660f678A895E4B72E7CB4CCd9C",
    wbtc: "0xC04B0d3107736C32e19F1c62b2aF67BE61d63a05",
    // renbtc: "0xE09fac962aA9BCf5c21B1987396c8A7C16C82B11",
  },
  aggregatorV3ETHUSD: networkConfig.hardhat.aggregatorV3ETHUSD,
  priceUSDMiner: networkConfig.hardhat.priceUSDMiner,
  balances: {
    dai: "500000",
  },
};
