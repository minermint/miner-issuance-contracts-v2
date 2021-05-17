const { getIssuance, saveNetworkArtifact } = require("../lib/deployer");

const MinerSwap = artifacts.require("./MinerSwap");
const MinerUSDOracle = artifacts.require("./oracles/MinerUSDOracle");

module.exports = async function(deployer, network) {
    const issuance = await getIssuance(network);
    const oracle = await MinerUSDOracle.deployed();

    let uniswapRouter = process.env.UNISWAP_ROUTER;
    let priceFeedETH = null;

    if (network === "soliditycoverage" || network === "development") {
        const DaiMock = artifacts.require("./mocks/DaiMock.sol");
        const UniswapV2Router02Mock = artifacts.require("./mocks/UniswapV2Router02Mock.sol");
        const UniswapFactoryMock = artifacts.require("./mocks/UniswapFactoryMock.sol");
        const PriceFeedETHMock = artifacts.require("./mocks/PriceFeedETHMock.sol");

        const uniswapFactory = await deployer.deploy(UniswapFactoryMock);

        await deployer.deploy(DaiMock);

        uniswapRouter = await deployer.deploy(UniswapV2Router02Mock, uniswapFactory.address);
        priceFeedETH = await deployer.deploy(PriceFeedETHMock);
    }

    const minerSwap = await deployer.deploy(
        MinerSwap,
        oracle.address,
        issuance.address,
        uniswapRouter.address);

    if (priceFeedETH) {
        minerSwap.setPriceFeedOracle(priceFeedETH.address);
    }

    await issuance.addIssuer(minerSwap.address);

    saveNetworkArtifact(minerSwap, deployer.network);
}
