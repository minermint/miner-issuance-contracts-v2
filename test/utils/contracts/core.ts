import { Contract } from "ethers";
import { testConfig } from "../../../config";
import ArtifactIERC20 from "@openzeppelin/contracts/build/contracts/IERC20.json";

export const getTruflationOracle = async () => {
  return await hre.ethers.getContract("TruflationUSDMinerPairMock");
};

export const getMiner = async () => {
  return new Contract(
    testConfig.miner,
    ArtifactIERC20.abi,
    hre.ethers.provider.getSigner()
  );
};
