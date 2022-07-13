import { ethers, waffle, deployments, getNamedAccounts } from "hardhat";
import { expect } from "chai";
import { Contract, BigNumber } from "ethers";
import { testConfig } from "../config";
import { getTwentyMinuteDeadline } from "./utils/deadline";
import { advanceBlockTimestamp } from "./utils/mining";
import {
  getUniswapV2Router02,
  getAggregatorV3ETHUSD,
  getDai,
} from "./utils/contracts/periphery";

import ArtifactIERC20 from "@openzeppelin/contracts/build/contracts/IERC20.json";

describe("MinerSwap", () => {
  let deployer: any;
  let owner: any;
  let issuer: any;
  let alice: any;
  let bob: any;

  let miner: any,
    minerSwap: any,
    issuance: any,
    aggregator: any,
    router: any,
    oracle: any;

  const supply = ethers.utils.parseEther("10");

  let deadline: number;

  before(async () => {
    ({ deployer, owner, issuer, alice, bob } = await getNamedAccounts());
  });

  beforeEach(async () => {
    miner = new Contract(
      testConfig.miner,
      ArtifactIERC20.abi,
      waffle.provider.getSigner()
    );

    await deployments.fixture(["all"]);
    oracle = await ethers.getContract("TruflationUSDMinerPairMock");

    issuance = await ethers.getContract("Issuance");

    await miner.transfer(issuance.address, supply);

    router = getUniswapV2Router02();

    minerSwap = await ethers.getContract("MinerSwap");

    await issuance.addIssuer(minerSwap.address);

    deadline = await getTwentyMinuteDeadline();

    aggregator = getAggregatorV3ETHUSD();
  });

  describe("instantiation", () => {
    it("should be able to change price feed oracle", async () => {
      await minerSwap.setPriceFeedOracle(aggregator.address);

      expect(await minerSwap.priceFeedOracle()).to.be.equal(aggregator.address);
    });

    it("should NOT be able to change price feed oracle without permission", async () => {
      await expect(
        minerSwap
          .connect(await ethers.getSigner(alice))
          .setPriceFeedOracle(aggregator.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should be able to change miner oracle", async () => {
      await minerSwap.setMinerOracle(aggregator.address);

      expect(await minerSwap.truflation()).to.be.equal(aggregator.address);
    });

    it("should be able to change issuance", async () => {
      await minerSwap.setIssuance(issuance.address);

      expect(await minerSwap.issuance()).to.be.equal(issuance.address);
    });

    it("should NOT be able to change miner oracle without permission", async () => {
      await expect(
        minerSwap
          .connect(await ethers.getSigner(alice))
          .setMinerOracle(aggregator.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should NOT be able to convert with a zero address price feed", async () => {
      await minerSwap.setPriceFeedOracle(ethers.constants.AddressZero);
      const amount = ethers.utils.parseEther("0.001");

      await expect(
        minerSwap.issueMinerForExactETH(0, deadline, { value: amount })
      ).to.be.revertedWith("MinerSwap/no-oracle-set");
    });
  });

  describe("ownership", async () => {
    it("should transfer ownership", async () => {
      await minerSwap.transferOwnership(alice);
      const newOwner = await minerSwap.owner();

      expect(newOwner).to.be.equal(alice);
    });

    it("should emit OwnershipTransferred event", async () => {
      await expect(minerSwap.transferOwnership(alice))
        .to.emit(minerSwap, "OwnershipTransferred")
        .withArgs(deployer, alice);
    });
  });

  describe("swaps", () => {
    beforeEach(async () => {
      await minerSwap.setPriceFeedOracle(aggregator.address);
    });

    describe("issuing miner for exact ETH", () => {
      const amount = ethers.utils.parseEther("0.001");
      let expectedRate: any, expected: any;

      let minerMin: BigNumber;

      beforeEach(async () => {
        minerMin = await minerSwap.calculateETHToMiner(amount);

        const roundData = await aggregator.latestRoundData();
        const answer = roundData[1];
        const xRate = await oracle.getTodaysExchangeRate();
        expectedRate = xRate.mul(ethers.utils.parseEther("1")).div(answer);

        expected = amount.mul(ethers.utils.parseEther("1")).div(expectedRate);
      });

      it("should issue miner for exact ETH", async () => {
        await minerSwap
          .connect(await ethers.getSigner(alice))
          .issueMinerForExactETH(minerMin, deadline, {
            value: amount,
          });

        const balance = await miner.balanceOf(alice);

        expect(balance).to.be.equal(expected);
      });

      it("should emit a IssuedMinerForExactETH event", async () => {
        await expect(
          minerSwap
            .connect(await ethers.getSigner(alice))
            .issueMinerForExactETH(minerMin, deadline, {
              value: amount,
            })
        )
          .to.emit(minerSwap, "IssuedMinerForExactETH")
          .withArgs(alice, issuance.address, amount, expected);
      });

      it("should NOT convert zero ETH", async () => {
        await expect(
          minerSwap
            .connect(await ethers.getSigner(alice))
            .issueMinerForExactETH(minerMin, deadline, {
              value: ethers.constants.Zero,
            })
        ).to.be.revertedWith("MinerSwap/deposit-invalid");
      });

      it("should NOT exceed issuing more miner than the issuance has available", async () => {
        // eat up the entire supply of issuance.
        await expect(
          minerSwap
            .connect(await ethers.getSigner(alice))
            .issueMinerForExactETH(
              await minerSwap.calculateETHToMiner(supply.add(1)),
              deadline,
              {
                value: supply.add(1),
              }
            )
        ).to.be.revertedWith("Issuance/balance-exceeded");
      });

      it("should NOT issue when deadline expires", async () => {
        advanceBlockTimestamp(30 * 60);

        await expect(
          minerSwap.issueMinerForExactETH(minerMin, deadline, {
            value: ethers.utils.parseEther("10"),
          })
        ).to.be.revertedWith("MinerSwap/deadline-expired");
      });

      it("should NOT convert if price falls below slippage", async () => {
        // increase the min miner beyond what will be swapped.
        const minerMin = (await minerSwap.calculateETHToMiner(amount)).add(1);

        await expect(
          minerSwap
            .connect(await ethers.getSigner(alice))
            .issueMinerForExactETH(minerMin, deadline, {
              value: amount,
            })
        ).to.be.revertedWith("MinerSwap/slippage");
      });
    });

    describe("issuing exact miner for ETH", () => {
      const exactMiner = ethers.utils.parseEther("1");

      let expectedRate: any, expected: any;

      let maxEthIn: BigNumber;

      beforeEach(async () => {
        maxEthIn = await minerSwap.calculateMinerToETH(exactMiner);

        const roundData = await aggregator.latestRoundData();
        const answer = roundData[1];
        const xRate = await oracle.getTodaysExchangeRate();
        expectedRate = xRate.mul(ethers.utils.parseEther("1")).div(answer);

        expected = maxEthIn.mul(ethers.utils.parseEther("1")).div(expectedRate);
      });

      it("should issue exact miner for ETH", async () => {
        await minerSwap
          .connect(await ethers.getSigner(alice))
          .issueExactMinerForETH(exactMiner, deadline, {
            value: maxEthIn,
          });

        const balance = await miner.balanceOf(alice);

        expect(balance).to.be.equal(expected);
      });

      it("should emit a IssuedExactMinerForETH event", async () => {
        await expect(
          minerSwap
            .connect(await ethers.getSigner(alice))
            .issueMinerForExactETH(exactMiner, deadline, {
              value: maxEthIn,
            })
        )
          .to.emit(minerSwap, "IssuedMinerForExactETH")
          .withArgs(alice, issuance.address, maxEthIn, expected);
      });

      it("should refund excess ETH", async () => {
        const ethBalance = await waffle.provider.getBalance(alice);

        const tx = await minerSwap
          .connect(await ethers.getSigner(alice))
          .issueExactMinerForETH(exactMiner, deadline, {
            value: maxEthIn.add(1),
          });

        const receipt = await tx.wait();

        const expected = ethBalance
          .sub(maxEthIn)
          .sub(receipt.gasUsed.mul(receipt.effectiveGasPrice));

        const balance = await waffle.provider.getBalance(alice);

        expect(balance).to.be.equal(expected);
      });
    });

    describe("issuing miner for exact tokens", async () => {
      const amount = ethers.utils.parseEther("10");

      let dai: any;
      let path: any;

      let minerMin: BigNumber;
      let requiredETHIn: BigNumber;

      beforeEach(async () => {
        dai = getDai();

        path = [];
        path[0] = dai.address;
        path[1] = await router.WETH();

        requiredETHIn = (await router.getAmountsOut(amount, path))[1];
        minerMin = await minerSwap.calculateETHToMiner(requiredETHIn);
      });

      it("should swap a token for miner", async () => {
        const balance = await miner.balanceOf(deployer);

        const expected = minerMin.add(balance);

        await dai.approve(minerSwap.address, amount);

        await minerSwap.issueMinerForExactTokens(
          dai.address,
          amount,
          minerMin,
          deadline
        );

        expect(await miner.balanceOf(deployer)).to.be.equal(expected);
      });

      it("should emit a Swapped Token for Miner event", async () => {
        await dai.approve(minerSwap.address, amount);

        await expect(
          minerSwap.issueMinerForExactTokens(
            dai.address,
            amount,
            minerMin,
            deadline
          )
        )
          .to.emit(minerSwap, "IssuedMinerForExactTokens")
          .withArgs(deployer, issuance.address, dai.address, amount, minerMin);
      });

      // TODO: Should this be moved to escrow?
      it("should have an Ether balance in MinerSwap", async () => {
        const expected = requiredETHIn;

        const initialBalance = await minerSwap.payments(deployer);

        await dai.approve(minerSwap.address, amount);

        await minerSwap.issueMinerForExactTokens(
          dai.address,
          amount,
          minerMin,
          deadline
        );

        await minerSwap.payments(deployer);
        let balance = await minerSwap.payments(deployer);

        balance = balance.sub(initialBalance);

        expect(balance).to.be.equal(expected);
      });

      it("should NOT swap when deadline expires", async () => {
        await dai.approve(minerSwap.address, amount, {
          from: deployer,
        });

        advanceBlockTimestamp(30 * 60);

        await expect(
          minerSwap.issueMinerForExactTokens(
            dai.address,
            amount,
            minerMin,
            deadline
          )
        ).to.be.revertedWith("UniswapV2Router: EXPIRED");
      });

      it("should NOT swap invalid token", async () => {
        await dai.approve(minerSwap.address, amount);

        expect(
          minerSwap.issueMinerForExactTokens(
            ethers.constants.AddressZero,
            amount,
            amount,
            deadline
          )
        ).to.be.revertedWith("");
      });

      it("should return tokens if deadline expires", async () => {
        const expected = await dai.balanceOf(deployer);

        await dai.approve(minerSwap.address, amount, {
          from: deployer,
        });

        advanceBlockTimestamp(30 * 60);

        await expect(
          minerSwap.issueMinerForExactTokens(
            dai.address,
            amount,
            minerMin,
            deadline
          )
        ).to.be.revertedWith("UniswapV2Router: EXPIRED");

        expect(await dai.balanceOf(deployer)).to.be.equal(expected);
      });

      it("should NOT swap if price falls below slippage", async () => {
        await dai.approve(minerSwap.address, amount);

        // increase the min miner beyond what will be swapped.
        const slippageMin = minerMin.add(ethers.utils.parseEther("1"));

        await expect(
          minerSwap.issueMinerForExactTokens(
            dai.address,
            amount,
            slippageMin,
            deadline
          )
        ).revertedWith("MinerSwap/slippage");
      });
    });

    describe("issuing exact miner for tokens", async () => {
      const exactMiner = ethers.utils.parseEther("1");

      let maxTokensIn: BigNumber;

      let dai: any;

      beforeEach(async () => {
        dai = getDai();

        const maxETHIn = await minerSwap.calculateMinerToETH(exactMiner);
        maxTokensIn = (
          await router.getAmountsIn(maxETHIn, [dai.address, router.WETH()])
        )[0];
      });

      it("should swap a token for miner", async () => {
        const balance = await miner.balanceOf(deployer);

        const expected = exactMiner.add(balance);

        await dai.approve(minerSwap.address, maxTokensIn);

        await minerSwap.issueExactMinerForTokens(
          dai.address,
          maxTokensIn,
          exactMiner,
          deadline
        );

        expect(await miner.balanceOf(deployer)).to.be.equal(expected);
      });

      it("should emit a Swapped Token for Miner event", async () => {
        await dai.approve(minerSwap.address, maxTokensIn);

        await expect(
          minerSwap.issueExactMinerForTokens(
            dai.address,
            maxTokensIn,
            exactMiner,
            deadline
          )
        )
          .to.emit(minerSwap, "IssuedExactMinerForTokens")
          .withArgs(
            deployer,
            issuance.address,
            dai.address,
            maxTokensIn,
            exactMiner
          );
      });
    });

    describe("escrow", () => {
      it("should withdraw to owner only", async () => {
        await minerSwap.transferOwnership(owner);

        const wei = ethers.utils.parseEther("0.001");

        const balanceBeforeWithdrawal = await waffle.provider.getBalance(owner);

        await minerSwap
          .connect(await ethers.getSigner(alice))
          .issueMinerForExactETH(0, deadline, {
            value: wei,
          });

        await minerSwap.withdrawPayments(owner);

        const balanceAfterWithdrawal = await waffle.provider.getBalance(owner);

        const expected = balanceBeforeWithdrawal.add(wei);

        expect(expected).to.be.equal(balanceAfterWithdrawal);
      });

      it("should NOT withdraw eth swap balance to bob", async () => {
        const wei = ethers.utils.parseEther("0.001");

        const balanceBeforeWithdrawal = await waffle.provider.getBalance(bob);

        await minerSwap
          .connect(await ethers.getSigner(alice))
          .issueMinerForExactETH(0, deadline, {
            value: wei,
          });

        await minerSwap.withdrawPayments(bob);

        const balanceAfterWithdrawal = await waffle.provider.getBalance(bob);

        expect(balanceBeforeWithdrawal).to.be.equal(balanceAfterWithdrawal);
      });
    });
  });
});
