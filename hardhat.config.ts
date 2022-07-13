import * as dotenv from "dotenv";

import { HardhatRuntimeEnvironment } from "hardhat/types";
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
  testConfig,
  networkConfig,
  privateKey,
  mnemonic,
  reportGas,
  etherscanAPIKey,
} from "./config";
import * as ExchangeRates from "./test/utils/xrates";

dotenv.config();

declare global {
  var hre: HardhatRuntimeEnvironment;
}

task("accounts", "Prints the list of accounts", async (_taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

task(
  "list-exchange-rates",
  "Lists the applicable exchange rates for Miner, ETH and some base ERC20 tokens",
  async (_taskArgs, hre: HardhatRuntimeEnvironment) => {
    await hre.deployments.fixture(["all"]);

    console.log("Unit test exchange rates\n");

    const ethPerMiner = await ExchangeRates.getMinerToETH(
      hre.ethers.utils.parseEther("1")
    );

    console.log(
      "1 Miner -> " + hre.ethers.utils.formatEther(ethPerMiner) + " ETH"
    );

    const daiPerMiner = await ExchangeRates.calculateTokensToExactMiner(
      testConfig.dai,
      hre.ethers.utils.parseEther("1")
    );

    console.log(
      "1 Miner -> " + hre.ethers.utils.formatEther(daiPerMiner) + " DAI"
    );
  }
);

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
