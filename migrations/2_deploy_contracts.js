
const Miner = artifacts.require("./Miner.sol");
const Treasury = artifacts.require("./Treasury.sol");
const MinerIssuance = artifacts.require("./MinerIssuance.sol");

const Artifactor = require("@truffle/artifactor");
const mkdirp = require('mkdirp');

module.exports = async function(deployer) {
    await deployer.deploy(Miner);

    const miner = await Miner.deployed();
    await deployer.deploy(Treasury, miner.address);

    const treasury = await Treasury.deployed();
    await miner.setMinter(treasury.address);

    await deployer.deploy(MinerIssuance, miner.address);
    const minerIssuance = await MinerIssuance.deployed();

    const networksPath = "./networks/"+deployer.network;

    mkdirp.sync(networksPath);

    const artifactor = new Artifactor(networksPath);

    const data = {
        [miner.constructor._json.contractName]: {
            "contractName": miner.constructor._json.contractName,
            "address": miner.address,
            "abi": miner.abi
        },
        [minerIssuance.constructor._json.contractName]: {
            "contractName": minerIssuance.constructor._json.contractName,
            address: minerIssuance.address,
            abi: minerIssuance.abi
        },
        [treasury.constructor._json.contractName]: {
            "contractName": treasury.constructor._json.contractName,
            address: treasury.address,
            abi: treasury.abi
        }
    }

    await artifactor.saveAll(data);
}
