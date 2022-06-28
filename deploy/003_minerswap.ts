import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";
import { networkConfig, developmentChains } from "../config";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts, network } = hre;
    const { deploy } = deployments;

    const { deployer } = await getNamedAccounts();

    const issuance = await ethers.getContract("Issuance");
    const oracle = await ethers.getContract("MinerUSDOracle");

    let uniswapRouterAddress;
    let priceFeedETH = null;

    if (developmentChains.includes(network.name)) {
        console.log(
            "deploying mock uniswap router, chainlink price feed and dai token..."
        );
        const uniswapFactory = await deploy("UniswapFactoryMock", {
            from: deployer,
            args: [],
        });

        await deploy("DaiMock", {
            from: deployer,
            args: [],
        });

        const unsiwapV2Router02Mock = await deploy("UniswapV2Router02Mock", {
            from: deployer,
            args: [uniswapFactory.address],
        });

        uniswapRouterAddress = unsiwapV2Router02Mock.address;

        priceFeedETH = await deploy("PriceFeedETHMock", {
            from: deployer,
            args: [],
        });
    } else {
        uniswapRouterAddress = networkConfig[network.name].uniswap_v2_router_02;
        console.log("using uniswap router at " + uniswapRouterAddress);
    }

    await deploy("MinerSwap", {
        from: deployer,
        args: [oracle.address, issuance.address, uniswapRouterAddress],
    });

    const minerSwap = await ethers.getContract("MinerSwap");

    if (priceFeedETH) {
        minerSwap.setPriceFeedOracle(priceFeedETH.address);
    } else {
        console.log(
            "you will need to manually specify the chainlink price feed!"
        );
    }

    await issuance.addIssuer(minerSwap.address);
};

export default func;
func.tags = ["minerswap", "contract", "all"];
