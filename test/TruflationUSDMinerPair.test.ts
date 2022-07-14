import { ethers, deployments } from "hardhat";
import { Contract } from "ethers";
import { expect } from "chai";

describe("TruflationUSDMinerPair", () => {
  let pair: Contract;

  beforeEach(async () => {
    await deployments.fixture(["all"]);
    pair = await ethers.getContract("TruflationUSDMinerPairMock");
  });

  it("should report today's inflation rate", async () => {
    expect(await pair.getTodaysInflationRate()).to.be.equal(
      ethers.utils.parseEther("0.1")
    );
  });

  it("should report today's exchange rate", async () => {
    expect(await pair.getTodaysExchangeRate()).to.be.equal(
      ethers.utils
        .parseUnits("3", 8)
        .add(
          ethers.utils
            .parseUnits("3", 8)
            .mul(ethers.utils.parseEther("0.1"))
            .div(ethers.utils.parseEther("1"))
        )
    );
  });
});
