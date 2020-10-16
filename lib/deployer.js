const Miner = artifacts.require("./Miner.sol");
const Treasury = artifacts.require("./Treasury.sol");
const Issuance = artifacts.require("./Issuance.sol");

const mkdirp = require('mkdirp');
const fs = require('fs');

const saveNetworkArtifact = async (contract, network) => {
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

const getContractMetadata = (contractName, network) => {
    const path = "../networks/"+network.replace("-fork", "")+"/"+contractName;
    const metadata = require(path);
    return metadata;
}

const getMiner = async (network) => {
    const metadata = getContractMetadata("Miner", network);
    const miner = await Miner.at(metadata.address);

    return miner;
}

const getTreasury = async (network) => {
    const metadata = getContractMetadata("Miner", network);
    const treasury = await Treasury.at(metadata.address);

    return treasury;
}

const getIssuance = async (network) => {
    const metadata = getContractMetadata("Issuance", network);
    const issuance = await Issuance.at(metadata.address);

    return issuance;
}

module.exports = {
  saveNetworkArtifact: saveNetworkArtifact,
  getContractMetadata: getContractMetadata,
  getMiner: getMiner,
  getTreasury: getTreasury,
  getIssuance: getIssuance
}
