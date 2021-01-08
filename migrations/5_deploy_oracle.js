const { getIssuance, saveNetworkArtifact } = require("../lib/deployer");

const MinerUSDOracle = artifacts.require("./oracles/MinerUSDOracle.sol");
const PriceFeedETH = artifacts.require("./PriceFeedETH.sol");
const PriceFeedTestToken = artifacts.require("./PriceFeedTestToken.sol");
const EthSwap = artifacts.require("./EthSwap.sol");
const TokenSwap = artifacts.require("./TokenSwap.sol");
const TestToken = artifacts.require("./TestToken.sol");

module.exports = async function(deployer, network) {
    let priceFeedETHAddress = null;

    await deployer.deploy(MinerUSDOracle);
    const oracle = await MinerUSDOracle.deployed();
    const issuance = await getIssuance(network);


    const ethSwap = await deployer.deploy(
        EthSwap,
        oracle.address,
        issuance.address);

    const tokenSwap = await deployer.deploy(
        TokenSwap,
        oracle.address,
        issuance.address);

    // if development, deploy the mock price feed.
    if (network == "development" || network == "test") {
        await deployer.deploy(PriceFeedETH);
        const priceFeedEth = await PriceFeedETH.deployed();
        priceFeedETHAddress = priceFeedEth.address;

        await deployer.deploy(PriceFeedTestToken);
        const priceFeedTestToken = await PriceFeedTestToken.deployed();

        await deployer.deploy(TestToken);
        const testToken = await TestToken.deployed();

        saveNetworkArtifact(priceFeedEth, deployer.network);
        saveNetworkArtifact(priceFeedTestToken, deployer.network);
        saveNetworkArtifact(testToken, deployer.network);
    }

    await issuance.addIssuer(ethSwap.address);
    await issuance.addIssuer(tokenSwap.address);

    saveNetworkArtifact(ethSwap, deployer.network);
    saveNetworkArtifact(tokenSwap, deployer.network);
    saveNetworkArtifact(oracle, deployer.network);
}
