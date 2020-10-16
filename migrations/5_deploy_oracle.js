const { getIssuance, saveNetworkArtifact } = require("../lib/deployer");

const MinerOracle = artifacts.require("./MinerOracle.sol");
const PriceFeed = artifacts.require("./PriceFeed.sol");

module.exports = async function(deployer, network) {
    let priceFeedAddress = process.env.CHAINLINK_PRICE_FEED;

    // if development, deploy the mock price feed.
    if (network === "development") {
        await deployer.deploy(PriceFeed);
        const priceFeed = await PriceFeed.deployed();
        priceFeedAddress = priceFeed.address;
    }

    await deployer.deploy(MinerOracle);
    const oracle = await MinerOracle.deployed();

    const issuance = await getIssuance(network);
    issuance.setMinerOracle(oracle.address);
    issuance.setPriceFeedOracle(priceFeedAddress);

    saveNetworkArtifact(oracle, deployer.network);
}
