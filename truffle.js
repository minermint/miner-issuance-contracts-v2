const config = require("./config.js");

const HDWalletProvider = require("@truffle/hdwallet-provider");

module.exports = {
    contracts_build_directory: "./build/truffle",
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
            gas: 6721975,
            networkCheckTimeout: 60000,
            mnemonic: config.mnemonic_or_private_key
        },
        teams: {
            url: "https://sandbox.truffleteams.com/2671a237-02b5-4db2-88da-0225e774e2a8",
            network_id: 1609904286339
        },
        kovan: {
            provider: new HDWalletProvider
            (
                config.mnemonic_or_private_key,
                "wss://kovan.infura.io/ws/v3/"+config.infura_id
            ),
            network_id: "42",
            confirmations: 4,
            timeoutBlocks: 200,
            skipDryRun: true,
            gasPrice: 10000000000
        }
    },
    // Configure your compilers
    compilers: {
        solc: {
            version: "0.7.6",
            settings: {
                optimizer: {
                    enabled: true
                }
            }
        }
    },
    mocha: {
        reporter: "eth-gas-reporter",
        reporterOptions: {
            currency: "USD"
        }
    },
    db: {
        enabled: false
    }
};
