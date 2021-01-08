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

    await issuance.addIssuer(ethSwap.address);
    await issuance.addIssuer(tokenSwap.address);

    saveNetworkArtifact(ethSwap, deployer.network);
    saveNetworkArtifact(tokenSwap, deployer.network);
    saveNetworkArtifact(oracle, deployer.network);
}
