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
