const { getOracle, saveNetworkArtifact } = require("../lib/deployer");

const MinerUSDOracle = artifacts.require("./oracles/MinerUSDOracle");

module.exports = async function(deployer, network) {
    await deployer.deploy(MinerUSDOracle);
    const oracle = await MinerUSDOracle.deployed();

    saveNetworkArtifact(oracle, deployer.network);
}
