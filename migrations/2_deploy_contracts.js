
const Miner = artifacts.require("./Miner.sol");
const Treasury = artifacts.require("./Treasury.sol");

module.exports = async function(deployer) {
    await deployer.deploy(Miner);

    const miner = await Miner.deployed();
    await deployer.deploy(Treasury, miner.address);
}
