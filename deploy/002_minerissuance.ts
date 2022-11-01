import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";
import { networkConfig } from "../config";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();

  const reserve = await ethers.getContract("MinerReserve");

  await deploy("MinerIssuance", {
    from: deployer,
    args: [
      networkConfig[network.name].priceUSDMiner,
      reserve.address,
      networkConfig[network.name].uniswapV2Router02,
    ],
  });

  const issuance = await ethers.getContract("MinerIssuance");

  issuance.changePriceFeed(networkConfig[network.name].aggregatorV3ETHUSD);

  await reserve.grantRole(await reserve.ISSUER_ROLE(), issuance.address);
};

export default func;
func.tags = ["minerissuance", "contract", "all"];
