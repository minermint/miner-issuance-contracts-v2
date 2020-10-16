require('dotenv').config();

const { getTreasury, getIssuance, getMiner } = require("../lib/deployer");

const Miner = artifacts.require("./Miner.sol");
const Treasury = artifacts.require("./Treasury.sol");
const Issuance = artifacts.require("./Issuance.sol");

module.exports = async function(deployer, network) {
    if (process.env.ISSUANCE_OWNER) {
        const issuance = await getIssuance(network);

        const newIssuanceOwner = process.env.ISSUANCE_OWNER;
        await issuance.transferOwnership(newIssuanceOwner);
    }

    if (process.env.CONTRACT_OWNER) {
        const newOwner = process.env.CONTRACT_OWNER;

        const treasury = await getTreasury(network);
        const miner = await getMiner(network);

        await treasury.transferOwnership(newOwner);
        await miner.transferOwnership(newOwner);
    }
}
