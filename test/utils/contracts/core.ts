export const getTruflationOracle = async () => {
  await hre.deployments.fixture(["all"]);
  return await hre.ethers.getContract("TruflationUSDMinerPairMock");
};
