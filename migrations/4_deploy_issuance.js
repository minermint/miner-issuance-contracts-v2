const { saveNetworkArtifact, getMiner } = require("../lib/deployer");

const Miner = artifacts.require("./Miner.sol");
const Issuance = artifacts.require("./Issuance.sol");

module.exports = async function(deployer, network) {
    const miner = await getMiner(network);

    await deployer.deploy(Issuance, miner.address);
    const issuance = await Issuance.deployed();

    saveNetworkArtifact(issuance, deployer.network);
}
