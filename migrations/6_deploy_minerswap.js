const config = require("../config.js");

const { saveNetworkArtifact } = require("../lib/deployer");

const Issuance = artifacts.require("./Issuance");
const MinerSwap = artifacts.require("./MinerSwap");
const MinerUSDOracle = artifacts.require("./oracles/MinerUSDOracle");

module.exports = async function(deployer, network) {
    const issuance = await Issuance.deployed();
    const oracle = await MinerUSDOracle.deployed();

    const contracts = config[network.replace("-fork", "")].contracts;

    let uniswapRouterAddress;
    let priceFeedETH = null;

    if (network === "soliditycoverage" || network === "development" || network === "development-fork") {
        console.log("deploying mock uniswap router, chainlink price feed and dai token...");

        const DaiMock = artifacts.require("./mocks/DaiMock.sol");
        const UniswapV2Router02Mock = artifacts.require("./mocks/UniswapV2Router02Mock.sol");
        const UniswapFactoryMock = artifacts.require("./mocks/UniswapFactoryMock.sol");
        const PriceFeedETHMock = artifacts.require("./mocks/PriceFeedETHMock.sol");

        const uniswapFactory = await deployer.deploy(UniswapFactoryMock);

        await deployer.deploy(DaiMock);

        uniswapRouter = await deployer.deploy(UniswapV2Router02Mock, uniswapFactory.address);
        uniswapRouterAddress = uniswapRouter.address;

        priceFeedETH = await deployer.deploy(PriceFeedETHMock);
    } else {
        uniswapRouterAddress = contracts.uniswap_v2_router_02;
        console.log("using uniswap router at " + uniswapRouterAddress);
    }

    const minerSwap = await deployer.deploy(
        MinerSwap,
        oracle.address,
        issuance.address,
        uniswapRouterAddress);

    if (priceFeedETH) {
        minerSwap.setPriceFeedOracle(priceFeedETH.address);
    } else {
        console.log("you will need to manually specify the chainlink price feed!");
    }

    await issuance.addIssuer(minerSwap.address);

    saveNetworkArtifact(minerSwap, deployer.network);
}
