require('dotenv').config();

const Miner = artifacts.require("./Miner.sol");
const Treasury = artifacts.require("./Treasury.sol");
const Issuance = artifacts.require("./Issuance.sol");

module.exports = async function(deployer) {
    const issuance = await Issuance.deployed();

    const newIssuanceOwner = process.env.ISSUANCE_OWNER;

    await issuance.transferOwnership(newIssuanceOwner);

    const newOwner = process.env.CONTRACT_OWNER;

    const treasury = await Treasury.deployed();
    const miner = await Miner.deployed();

    await treasury.transferOwnership(newOwner);
    await miner.transferOwnership(newOwner);
}
