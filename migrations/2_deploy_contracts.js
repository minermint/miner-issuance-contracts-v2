
const Miner = artifacts.require("./Miner.sol");
const Treasury = artifacts.require("./Treasury.sol");
const Issuance = artifacts.require("./Issuance.sol");

const mkdirp = require('mkdirp');
var fs = require('fs');

const saveNetworkArtifact = async function(contract, network) {
    const contractName = contract.constructor._json.contractName;
    const networksPath = "./networks/"+network;
    const contractPath = networksPath+"/"+contractName+".json";

    mkdirp.sync(networksPath);

    const artifact = {
        "contractName": contractName,
        "address": contract.address,
        "abi": contract.abi
    }

    fs.writeFileSync(contractPath, JSON.stringify(artifact, null, 2));
}

module.exports = async function(deployer) {
    await deployer.deploy(Miner);
    const miner = await Miner.deployed();

    saveNetworkArtifact(miner, deployer.network);

    await deployer.deploy(Issuance, miner.address);
    const issuance = await Issuance.deployed();

    saveNetworkArtifact(issuance, deployer.network);

    await deployer.deploy(Treasury, miner.address);
    const treasury = await Treasury.deployed();

    saveNetworkArtifact(treasury, deployer.network);

    await miner.setMinter(treasury.address);
}
