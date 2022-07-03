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
import {
  networkConfig,
  privateKey,
  mnemonic,
  reportGas,
  etherscanAPIKey,
} from "./config";

dotenv.config();

task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.9",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    kovan: {
      url: networkConfig["kovan"].url,
      accounts: privateKey !== undefined ? [privateKey] : [],
    },
    hardhat: {
      accounts: {
        mnemonic: mnemonic,
      },
      forking: {
        url: networkConfig["hardhat"].url,
      },
    },
  },
  gasReporter: {
    enabled: reportGas !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: etherscanAPIKey,
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
