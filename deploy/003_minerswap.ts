import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";
import { networkConfig, testConfig } from "../config";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();

  const issuance = await ethers.getContract("Issuance");
  const oracle = await ethers.getContract("TruflationUSDMinerPairMock");

  await deploy("MinerSwap", {
    from: deployer,
    args: [
      oracle.address,
      issuance.address,
      networkConfig[network.name].uniswap_v2_router_02,
    ],
  });

  const minerSwap = await ethers.getContract("MinerSwap");

  minerSwap.setPriceFeedOracle(networkConfig[network.name].aggregatorV3ETHUSD);

  await issuance.addIssuer(minerSwap.address);
};

export default func;
func.tags = ["minerswap", "contract", "all"];
