const { saveNetworkArtifact } = require("../lib/deployer");

const Miner = artifacts.require("./Miner.sol");
const Treasury = artifacts.require("./Treasury.sol");
const Issuance = artifacts.require("./Issuance.sol");

module.exports = async function(deployer, network) {
    if (network === "mainnet" || network === "kovan-fork" || network === "kovan") {
        console.log("skipping Miner deployment...");
        return;
    } else {
        await deployer.deploy(Miner);
        const miner = await Miner.deployed();

        saveNetworkArtifact(miner, deployer.network);
    }
}
