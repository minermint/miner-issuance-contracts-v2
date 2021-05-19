const Miner = artifacts.require("./Miner.sol");
const Treasury = artifacts.require("./Treasury.sol");
const Issuance = artifacts.require("./Issuance.sol");

const mkdirp = require('mkdirp');
const fs = require('fs');

const basePath = process.cwd()+"/..";
const buildPath = basePath+"/build";
const contractsPath = buildPath+"/contracts";
const abisPath = contractsPath+"/abis";

const saveNetworkArtifact = (contract, network) => {
    mkdirp.sync(abisPath);

    const contractName = contract.constructor._json.contractName;
    const networkPath = contractsPath+"/"+network+".json";

    let artifact = {};

    try {
        const data = fs.readFileSync(networkPath);

        artifact = JSON.parse(data);
    } catch (error) {
        if (error.code === "ENOENT") {
            console.log(networkPath+" does not exist. creating...");
        } else {
            console.error(error);
        }
    }

    artifact[contractName] = contract.address;

    fs.writeFileSync(networkPath, JSON.stringify(artifact, null, 2));

    const abiPath = abisPath+"/"+contractName+".json";

    // we're not deploying contracts using create2 so just store the abi.
    const json = contract.abi;

    fs.writeFileSync(abiPath, JSON.stringify(json, null, 2));
}

const getContractMetadata = (contractName, network) => {
    const networkPath = contractsPath+"/"+network+".json";
    const data = fs.readFileSync(networkPath);
    metadata = JSON.parse(data);

    return metadata;
}

const getMiner = async (network) => {
    const metadata = getContractMetadata("Miner", network);
    const miner = await Miner.at(metadata.Miner);

    return miner;
}

const getTreasury = async (network) => {
    const metadata = getContractMetadata("Treasury", network);
    const treasury = await Treasury.at(metadata.Treasury);

    return treasury;
}

const getIssuance = async (network) => {
    const metadata = getContractMetadata("Issuance", network);
    const issuance = await Issuance.at(metadata.Issuance);

    return issuance;
}

module.exports = {
  saveNetworkArtifact: saveNetworkArtifact,
  getContractMetadata: getContractMetadata,
  getMiner: getMiner,
  getTreasury: getTreasury,
  getIssuance: getIssuance
}
