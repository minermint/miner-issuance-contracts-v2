const { getIssuance, saveNetworkArtifact } = require("../lib/deployer");

const MinerUSDOracle = artifacts.require("./oracles/MinerUSDOracle");
const PriceFeedETH = artifacts.require("./PriceFeedETH");
const MinerSwap = artifacts.require("./MinerSwap");

module.exports = async function(deployer, network) {
    await deployer.deploy(MinerUSDOracle);
    const oracle = await MinerUSDOracle.deployed();
    const issuance = await getIssuance(network);


    const minerSwap = await deployer.deploy(
        MinerSwap,
        oracle.address,
        issuance.address,
        process.env.UNISWAP_ROUTER);

    await issuance.addIssuer(minerSwap.address);

    saveNetworkArtifact(minerSwap, deployer.network);
    saveNetworkArtifact(oracle, deployer.network);
}
