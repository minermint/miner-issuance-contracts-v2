import { expect } from "chai";
import { ethers, deployments, getNamedAccounts } from "hardhat";
import { Contract } from "ethers";
import { testConfig } from "../config";

// @ts-ignore
import type { MinerReserve } from "../typechain-types";

import ArtifactIERC20 from "@openzeppelin/contracts/build/contracts/IERC20.json";

describe("MinerReserve", () => {
  const ZERO_BALANCE = 0;

  let reserve: MinerReserve;
  let miner: Contract;

  let deployer: any;
  let issuer: any;
  let alice: any;
  let bob: any;

  const supply = ethers.utils.parseEther("1");

  before(async () => {
    ({ deployer, issuer, alice, bob } = await getNamedAccounts());
  });

  beforeEach(async () => {
    await deployments.fixture(["all"]);
    reserve = await ethers.getContract<MinerReserve>("MinerReserve");

    miner = new Contract(
      testConfig.miner,
      ArtifactIERC20.abi,
      ethers.provider.getSigner()
    );

    await miner.transfer(reserve.address, supply);
  });

  it("should fund the token reserve", async () => {
    expect(await miner.balanceOf(reserve.address)).to.be.equal(supply);
  });

  it("should be able to change contract ownership", async () => {
    await reserve.transferOwnership(alice);

    expect(await reserve.owner()).to.be.equal(alice);
  });

  describe("permitting reserve", () => {
    it("should add a new admin as owner", async () => {
      await reserve.grantRole(await reserve.ADMIN(), alice);

      expect(await reserve.hasRole(await reserve.ADMIN(), alice)).to.be.true;
    });

    it("should add a new admin as admin", async () => {
      await reserve.grantRole(await reserve.ADMIN(), alice);
      await reserve
        .connect(await ethers.getSigner(alice))
        .grantRole(await reserve.ADMIN(), bob);

      expect(await reserve.hasRole(await reserve.ADMIN(), bob)).to.be.true;
    });

    it("should add an issuer", async () => {
      await reserve.addIssuer(issuer);

      expect(await reserve.hasRole(await reserve.ISSUER(), issuer)).to.be.true;
    });

    it("should emit a RoleGranted event", async () => {
      const args = [await reserve.ISSUER(), issuer, deployer];
      await expect(reserve.addIssuer(issuer))
        .to.emit(reserve, "RoleGranted")
        .withArgs(...args);
    });

    it("should add an issuer as admin", async () => {
      await reserve.grantRole(reserve.ADMIN(), alice);
      await reserve
        .connect(await ethers.getSigner(alice))
        .grantRole(reserve.ISSUER(), bob);

      expect(await reserve.hasRole(reserve.ISSUER(), bob)).to.be.true;
    });

    it("should remove an issuer", async () => {
      await reserve.addIssuer(issuer);
      await reserve.removeIssuer(issuer);

      expect(await reserve.hasRole(reserve.ISSUER(), issuer)).to.be.false;
    });

    it("should emit a RoleRevoked event", async () => {
      const args = [await reserve.ISSUER(), issuer, deployer];
      await reserve.addIssuer(issuer);

      await expect(await reserve.removeIssuer(issuer))
        .to.emit(reserve, "RoleRevoked")
        .withArgs(...args);
    });

    it("should NOT add issuer using invalid admin", async () => {
      await expect(
        reserve.connect(await ethers.getSigner(bob)).issue(alice, ZERO_BALANCE)
      ).to.revertedWith("MinerReserve/no-issuer-privileges");
    });
  });

  describe("issuing miner", () => {
    beforeEach(async () => {
      await reserve.addIssuer(issuer);
    });

    it("should issue miner tokens", async () => {
      await reserve
        .connect(await ethers.getSigner(issuer))
        .issue(alice, supply);

      const balance = await miner.balanceOf(alice);

      expect(balance).to.be.equal(supply);
    });

    it("should emit a Issued event", async () => {
      await expect(
        reserve.connect(await ethers.getSigner(issuer)).issue(alice, supply)
      )
        .to.emit(reserve, "Issued")
        .withArgs(alice, supply);
    });

    it("should NOT issue from an invalid address", async () => {
      await expect(
        reserve.connect(await ethers.getSigner(bob)).issue(alice, supply)
      ).to.revertedWith("MinerReserve/no-issuer-privileges");
    });

    it("should NOT issue zero tokens", async () => {
      await expect(
        reserve
          .connect(await ethers.getSigner(issuer))
          .issue(alice, ZERO_BALANCE)
      ).to.revertedWith("MinerReserve/amount-invalid");
    });

    it("should NOT exceed issuing more tokens than are available", async () => {
      await expect(
        reserve
          .connect(await ethers.getSigner(issuer))
          .issue(alice, supply.add(1))
      ).to.revertedWith("MinerReserve/balance-exceeded");
    });
  });
});
