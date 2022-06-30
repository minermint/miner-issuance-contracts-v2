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
        aggregatorV3ETHUSD: "0x9326BFA02ADD2366b30bacB125260Af641031331"
    },
    hardhat: {
        url: process.env.KOVAN_URL || "",
        miner: "0x9Ae895b0C267A4d7fd049c95C522Be99FbaEa6De",
        uniswap_v2_router_02: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
        aggregatorV3ETHUSD: "0x9326BFA02ADD2366b30bacB125260Af641031331"
    },
};

export interface testConfigInfo {
    miner: string;
    uniswapV2Router02: string;
    dai: string;
    aggregatorV3ETHUSD: string;
}

export const testConfig: testConfigInfo = {
    miner: networkConfig.hardhat.miner,
    uniswapV2Router02: networkConfig.hardhat.uniswap_v2_router_02,
    dai: "0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa",
    aggregatorV3ETHUSD: networkConfig.hardhat.aggregatorV3ETHUSD
};
