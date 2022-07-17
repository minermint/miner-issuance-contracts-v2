import { ethers, deployments } from "hardhat";
import { expect } from "chai";

// @ts-ignore
import { TruflationUSDMinerPairMock } from "../typechain-types";

describe("TruflationUSDMinerPair", () => {
  let pair: TruflationUSDMinerPairMock;

  beforeEach(async () => {
    await deployments.fixture(["all"]);
    pair = await ethers.getContract<TruflationUSDMinerPairMock>(
      "TruflationUSDMinerPairMock"
    );
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
