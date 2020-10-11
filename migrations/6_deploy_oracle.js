const PriceFeed = artifacts.require("./mocks/PriceFeed.sol");
const MinerOracle = artifacts.require("./MinerOracle.sol");
const Issuance = artifacts.require("./Issuance.sol");

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

module.exports = async function(deployer, network) {
    let priceFeedAddress = process.env.CHAINLINK_PRICE_FEED;

    // if development, deploy the mock price feed.
    if (network === "development") {
        await deployer.deploy(PriceFeed);
        const priceFeed = await PriceFeed.deployed();
        priceFeedAddress = priceFeed.address;
    }

    await deployer.deploy(MinerOracle, priceFeedAddress);
    const oracle = await MinerOracle.deployed();

    const issuance = await Issuance.deployed();
    issuance.setMinerOracle(oracle.address);

    saveNetworkArtifact(oracle, deployer.network);
}
