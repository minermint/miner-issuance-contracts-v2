import { ethers, deployments } from "hardhat";

export const getTruflationOracle = async () => {
  await deployments.fixture(["all"]);
  return await ethers.getContract("TruflationUSDMinerPairMock");
};
