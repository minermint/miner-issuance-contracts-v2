import { Contract } from "ethers";
import { testConfig } from "../../../config";
import ArtifactIERC20 from "@openzeppelin/contracts/build/contracts/IERC20.json";

// @ts-ignore
import type { IUSDMinerPair } from "../../../typechain-types";

export const getPair = async (): Promise<IUSDMinerPair> => {
  const artifact = await hre.deployments.getArtifact("IUSDMinerPair");

  return await hre.ethers.getContractAt<IUSDMinerPair>(
    artifact.abi,
    testConfig.priceUSDMiner
  );
};

export const getMiner = (): Contract => {
  return new Contract(
    testConfig.miner,
    ArtifactIERC20.abi,
    hre.ethers.provider.getSigner()
  );
};
