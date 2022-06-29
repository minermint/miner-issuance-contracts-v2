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
}

export interface networkConfigInfo {
    [key: string]: networkConfigItem;
}

export const networkConfig: networkConfigInfo = {
    kovan: {
        url: process.env.KOVAN_URL || "",
        miner: "0x9Ae895b0C267A4d7fd049c95C522Be99FbaEa6De",
        uniswap_v2_router_02: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    },
    hardhat: {
        url: process.env.KOVAN_URL || "",
        miner: "0x9Ae895b0C267A4d7fd049c95C522Be99FbaEa6De",
        uniswap_v2_router_02: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    },
};

export interface testConfigInfo {
    miner: string;
}

export const testConfig: testConfigInfo = {
    miner: networkConfig.hardhat.miner,
};
