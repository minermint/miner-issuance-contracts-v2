const { getIssuance, saveNetworkArtifact } = require("../lib/deployer");

const MinerUSDOracle = artifacts.require("./oracles/MinerUSDOracle");
const PriceFeedETH = artifacts.require("./PriceFeedETH");
const EthSwap = artifacts.require("./EthSwap");

module.exports = async function(deployer, network) {
    let priceFeedETHAddress = null;

    await deployer.deploy(MinerUSDOracle);
    const oracle = await MinerUSDOracle.deployed();
    const issuance = await getIssuance(network);


    const ethSwap = await deployer.deploy(
        EthSwap,
        oracle.address,
        issuance.address);

    // if development, deploy the mock price feed.
    if (["development", "test", "soliditycoverage"].includes(network)) {
        await deployer.deploy(PriceFeedETH);
        const priceFeedEth = await PriceFeedETH.deployed();
        priceFeedETHAddress = priceFeedEth.address;

        saveNetworkArtifact(priceFeedEth, deployer.network);
    }

    await issuance.addIssuer(ethSwap.address);

    saveNetworkArtifact(ethSwap, deployer.network);
    saveNetworkArtifact(oracle, deployer.network);
}
