import * as dotenv from "dotenv";

import { HardhatUserConfig, task } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-ethers";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "hardhat-deploy";
import "hardhat-docgen";

dotenv.config();

const config: HardhatUserConfig = {
    solidity: "0.8.9",
    networks: {
        ropsten: {
            url: process.env.ROPSTEN_URL || "",
            accounts:
                process.env.PRIVATE_KEY !== undefined
                    ? [process.env.PRIVATE_KEY]
                    : [],
        },
        hardhat: {
            accounts: {
                mnemonic: process.env.MNEMONIC,
            },
            forking: {
                url: "https://eth-kovan.alchemyapi.io/v2/lnEmnlnoMNq0mlWnbHhyakSPY4Zuskej",
            },
        },
    },
    gasReporter: {
        enabled: process.env.REPORT_GAS !== undefined,
        currency: "USD",
    },
    etherscan: {
        apiKey: process.env.ETHERSCAN_API_KEY,
    },
    namedAccounts: {
        deployer: 0,
        owner: 1,
        issuer: 2,
        alice: 3,
        bob: 4,
    },
};

export default config;
