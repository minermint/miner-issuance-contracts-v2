import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";
import { networkConfig } from "../config";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();

  const reserve = await ethers.getContract("MinerReserve");
  const oracle = await ethers.getContract("TruflationUSDMinerPairMock");

  await deploy("MinerIssuance", {
    from: deployer,
    args: [
      oracle.address,
      reserve.address,
      networkConfig[network.name].uniswap_v2_router_02,
    ],
  });

  const issuance = await ethers.getContract("MinerIssuance");

  issuance.setPriceFeedOracle(networkConfig[network.name].aggregatorV3ETHUSD);

  await reserve.addIssuer(issuance.address);
};

export default func;
func.tags = ["minerissuance", "contract", "all"];
