import { Contract } from "ethers";
import { testConfig } from "../../../config";
import ArtifactIERC20 from "@openzeppelin/contracts/build/contracts/IERC20.json";

// @ts-ignore
import type { TruflationUSDMinerPairMock } from "../../../typechain-types";

export const getTruflationOracle =
  async (): Promise<TruflationUSDMinerPairMock> => {
    return await hre.ethers.getContract<TruflationUSDMinerPairMock>(
      "TruflationUSDMinerPairMock"
    );
  };

export const getMiner = (): Contract => {
  return new Contract(
    testConfig.miner,
    ArtifactIERC20.abi,
    hre.ethers.provider.getSigner()
  );
};
