const { getIssuance, saveNetworkArtifact } = require("../lib/deployer");

const MinerOracle = artifacts.require("./MinerOracle.sol");
const PriceFeed = artifacts.require("./PriceFeed.sol");
const MinerEthPair = artifacts.require("./pairs/MinerEthPair.sol");

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

    await deployer.deploy(MinerEthPair, oracle.address, priceFeedAddress);

    const minerEthPair = await MinerEthPair.deployed();

    await issuance.registerSwapPair("eth", minerEthPair.address);

    saveNetworkArtifact(oracle, deployer.network);
}
