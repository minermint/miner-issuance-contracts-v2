const PriceFeed = artifacts.require("./PriceFeed.sol");
const MinerOracle = artifacts.require("./MinerOracle.sol");

const mkdirp = require('mkdirp');
const fs = require('fs');

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
    await deployer.deploy(PriceFeed);
    const priceFeed = await PriceFeed.deployed();

    await deployer.deploy(MinerOracle, priceFeed.address);
    const oracle = await MinerOracle.deployed();

    saveNetworkArtifact(oracle, deployer.network);
}
