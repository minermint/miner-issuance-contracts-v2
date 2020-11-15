const { getIssuance, saveNetworkArtifact } = require("../lib/deployer");

const MinerOracle = artifacts.require("./MinerOracle.sol");
const PriceFeedETH = artifacts.require("./PriceFeedETH.sol");
const PriceFeedDAI = artifacts.require("./PriceFeedDAI.sol");

module.exports = async function(deployer, network) {
    let priceFeedETHAddress = process.env.CHAINLINK_PRICE_FEED_ETH;

    // if development, deploy the mock price feed.
    if (network === "development") {
        await deployer.deploy(PriceFeedETH);
        const priceFeed = await PriceFeedETH.deployed();
        priceFeedETHAddress = priceFeed.address;
    }

    await deployer.deploy(MinerOracle);
    const oracle = await MinerOracle.deployed();

    const issuance = await getIssuance(network);
    issuance.setEthPriceFeedOracle(priceFeedETHAddress);

    saveNetworkArtifact(oracle, deployer.network);
}
