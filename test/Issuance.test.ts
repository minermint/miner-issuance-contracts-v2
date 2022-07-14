import { expect } from "chai";
import { ethers, deployments, getNamedAccounts } from "hardhat";
import { Contract } from "ethers";
import { testConfig } from "../config";
import type { Issuance } from "../typechain-types";

import ArtifactIERC20 from "@openzeppelin/contracts/build/contracts/IERC20.json";

describe("Issuance", () => {
  const ZERO_BALANCE = 0;

  let issuance: Issuance;
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
    issuance = await ethers.getContract<Issuance>("Issuance");

    miner = new Contract(
      testConfig.miner,
      ArtifactIERC20.abi,
      ethers.provider.getSigner()
    );

    await miner.transfer(issuance.address, supply);
  });

  it("should fund the token issuance", async () => {
    expect(await miner.balanceOf(issuance.address)).to.be.equal(supply);
  });

  it("should be able to change contract ownership", async () => {
    await issuance.transferOwnership(alice);

    expect(await issuance.owner()).to.be.equal(alice);
  });

  describe("permitting issuance", () => {
    it("should add a new admin as owner", async () => {
      await issuance.grantRole(await issuance.ADMIN(), alice);

      expect(await issuance.hasRole(await issuance.ADMIN(), alice)).to.be.true;
    });

    it("should add a new admin as admin", async () => {
      await issuance.grantRole(await issuance.ADMIN(), alice);
      await issuance
        .connect(await ethers.getSigner(alice))
        .grantRole(await issuance.ADMIN(), bob);

      expect(await issuance.hasRole(await issuance.ADMIN(), bob)).to.be.true;
    });

    it("should add an issuer", async () => {
      await issuance.addIssuer(issuer);

      expect(await issuance.hasRole(await issuance.ISSUER(), issuer)).to.be
        .true;
    });

    it("should emit a RoleGranted event", async () => {
      const args = [await issuance.ISSUER(), issuer, deployer];
      await expect(issuance.addIssuer(issuer))
        .to.emit(issuance, "RoleGranted")
        .withArgs(...args);
    });

    it("should add an issuer as admin", async () => {
      await issuance.grantRole(issuance.ADMIN(), alice);
      await issuance
        .connect(await ethers.getSigner(alice))
        .grantRole(issuance.ISSUER(), bob);

      expect(await issuance.hasRole(issuance.ISSUER(), bob)).to.be.true;
    });

    it("should remove an issuer", async () => {
      await issuance.addIssuer(issuer);
      await issuance.removeIssuer(issuer);

      expect(await issuance.hasRole(issuance.ISSUER(), issuer)).to.be.false;
    });

    it("should emit a RoleRevoked event", async () => {
      const args = [await issuance.ISSUER(), issuer, deployer];
      await issuance.addIssuer(issuer);

      await expect(await issuance.removeIssuer(issuer))
        .to.emit(issuance, "RoleRevoked")
        .withArgs(...args);
    });

    it("should NOT add issuer using invalid admin", async () => {
      await expect(
        issuance.connect(await ethers.getSigner(bob)).issue(alice, ZERO_BALANCE)
      ).to.revertedWith("Issuance/no-issuer-privileges");
    });
  });

  describe("issuing miner", () => {
    beforeEach(async () => {
      await issuance.addIssuer(issuer);
    });

    it("should issue miner tokens", async () => {
      await issuance
        .connect(await ethers.getSigner(issuer))
        .issue(alice, supply);

      const balance = await miner.balanceOf(alice);

      expect(balance).to.be.equal(supply);
    });

    it("should emit a Issued event", async () => {
      await expect(
        issuance.connect(await ethers.getSigner(issuer)).issue(alice, supply)
      )
        .to.emit(issuance, "Issued")
        .withArgs(alice, supply);
    });

    it("should NOT issue from an invalid address", async () => {
      await expect(
        issuance.connect(await ethers.getSigner(bob)).issue(alice, supply)
      ).to.revertedWith("Issuance/no-issuer-privileges");
    });

    it("should NOT issue zero tokens", async () => {
      await expect(
        issuance
          .connect(await ethers.getSigner(issuer))
          .issue(alice, ZERO_BALANCE)
      ).to.revertedWith("Issuance/amount-invalid");
    });

    it("should NOT exceed issuing more tokens than are available", async () => {
      await expect(
        issuance
          .connect(await ethers.getSigner(issuer))
          .issue(alice, supply.add(1))
      ).to.revertedWith("Issuance/balance-exceeded");
    });
  });
});
