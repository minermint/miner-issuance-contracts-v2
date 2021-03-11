require('dotenv').config();

const HDWalletProvider = require("@truffle/hdwallet-provider");

module.exports = {
    plugins: [
        "truffle-security",
        "solidity-coverage",
        "truffle-ganache-test"
    ],
    networks: {
        development: {
            host: "localhost",
            port: 8545,
            network_id: "*", // Match any network id
            gas: 6721975
        },
        teams: {
          url: "https://sandbox.truffleteams.com/2671a237-02b5-4db2-88da-0225e774e2a8",
          network_id: 1609904286339
        }
    },
    // Configure your compilers
    compilers: {
        solc: {
            version: "0.6.12"
        }
    },
    mocha: {
        reporter: "eth-gas-reporter",
        reporterOptions: {
            currency: "USD"
        }
    }
};
