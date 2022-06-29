import "dotenv/config";

export const MNEMONIC_OR_PRIVATE_KEY = process.env.MNEMONIC
    ? process.env.MNEMONIC
    : process.env.PRIVATE_KEY;
export const INFURA_ID = process.env.INFURA_ID;
export const developmentChains = ["hardhat", "localhost"];

export interface networkConfigItem {
    miner: string;
    uniswap_v2_router_02: string;
}

export interface networkConfigInfo {
    [key: string]: networkConfigItem;
}

export const networkConfig: networkConfigInfo = {
    kovan: {
        miner: "0x9Ae895b0C267A4d7fd049c95C522Be99FbaEa6De",
        uniswap_v2_router_02: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    },
    hardhat: {
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
