
const Miner = artifacts.require("./Miner.sol");
const Treasury = artifacts.require("./Treasury.sol");
const Issuance = artifacts.require("./Issuance.sol");

const Artifactor = require("@truffle/artifactor");
const mkdirp = require('mkdirp');

module.exports = async function(deployer) {
    await deployer.deploy(Miner);

    const miner = await Miner.deployed();

    await deployer.deploy(Issuance, miner.address);

    const issuance = await Issuance.deployed();

    await deployer.deploy(Treasury, miner.address, issuance.address);

    const treasury = await Treasury.deployed();
    await miner.setMinter(treasury.address);

    const networksPath = "./networks/"+deployer.network;

    mkdirp.sync(networksPath);

    const artifactor = new Artifactor(networksPath);

    const data = {
        [miner.constructor._json.contractName]: {
            "contractName": miner.constructor._json.contractName,
            "address": miner.address,
            "abi": miner.abi
        },
        [issuance.constructor._json.contractName]: {
            "contractName": issuance.constructor._json.contractName,
            address: issuance.address,
            abi: issuance.abi
        },
        [treasury.constructor._json.contractName]: {
            "contractName": treasury.constructor._json.contractName,
            address: treasury.address,
            abi: treasury.abi
        }
    }

    await artifactor.saveAll(data);
}
