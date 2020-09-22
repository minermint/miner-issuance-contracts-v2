require('dotenv').config();

const Issuance = artifacts.require("./Issuance.sol");

module.exports = async function(deployer) {
    const issuance = await Issuance.deployed();

    const newIssuanceOwner = process.env.ISSUANCE_OWNER;

    await issuance.transferOwnership(newIssuanceOwner);
}
