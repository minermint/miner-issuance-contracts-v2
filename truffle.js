require('dotenv').config()

const HDWalletProvider = require("@truffle/hdwallet-provider");

module.exports = {
  plugins: [
    "truffle-security",
    "solidity-coverage"
  ],
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*", // Match any network id
      gas: 4600000
    },
    ropsten: {
      provider:  () => {
        return new HDWalletProvider(
          process.env.MNEMONIC,
          process.env.ROPSTEN_URL,
          process.env.ROPSTEN_ACCOUNT_ID)
      },
      network_id: "3",
      gas: 4500000,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true
   },
  },
  // Configure your compilers
  compilers: {
    solc: {
      version: "0.6.4"
    }
  },
  mocha: {
    reporter: 'eth-gas-reporter'
  }
};
