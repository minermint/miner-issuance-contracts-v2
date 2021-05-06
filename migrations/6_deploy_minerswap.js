const { getIssuance, saveNetworkArtifact } = require("../lib/deployer");

const MinerSwap = artifacts.require("./MinerSwap");
const MinerUSDOracle = artifacts.require("./oracles/MinerUSDOracle");
const PriceFeedETH = artifacts.require("./mocks/PriceFeedETH.sol");

module.exports = async function(deployer, network) {
    const issuance = await getIssuance(network);
    const oracle = await MinerUSDOracle.deployed();

    let uniswapRouter = process.env.UNISWAP_ROUTER;

    if (network === "soliditycoverage") {
        process.env.NETWORK = network;
        await deployer.deploy(PriceFeedETH);
    }

    const minerSwap = await deployer.deploy(
        MinerSwap,
        oracle.address,
        issuance.address,
        uniswapRouter);

    await issuance.addIssuer(minerSwap.address);

    saveNetworkArtifact(minerSwap, deployer.network);
}
