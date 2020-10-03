require('dotenv').config();

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
            gas: 6721975
        },
        ropsten: {
            provider: new HDWalletProvider(
                process.env.PRIVATE_KEY,
                process.env.ROPSTEN_URL),
            network_id: "3",
            confirmations: 4,
            timeoutBlocks: 200,
            skipDryRun: true,
            gasPrice: 10000000000,
        },
        mainnet: {
            provider: new HDWalletProvider(
                process.env.PRIVATE_KEY,
                process.env.MAINNET_URL),
            network_id: "1",
            confirmations: 6,
            timeoutBlocks: 200,
            gasPrice: 130000000000,
        },
    },
    // Configure your compilers
    compilers: {
        solc: {
            version: "0.6.8"
        }
    },
    mocha: {
        reporter: "eth-gas-reporter",
        reporterOptions: {
            currency: "USD"
        }
    }
};
