import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "ethers";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();

  await deploy("TruflationUSDMinerPairMock", {
    from: deployer,
    args: [ethers.utils.parseUnits("3", 8)],
  });
};

export default func;
func.tags = ["oracle", "contract", "all"];
