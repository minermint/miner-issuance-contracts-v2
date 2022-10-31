import { ethers, deployments, getNamedAccounts } from "hardhat";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { getTwentyMinuteDeadline } from "./utils/deadline";
import * as helpers from "@nomicfoundation/hardhat-network-helpers";
import { getMiner, getPair } from "./utils/contracts/core";
import {
  getUniswapV2Router02,
  getAggregatorV3ETHUSD,
  getERC20Token,
} from "./utils/contracts/periphery";
import {
  calculateTokensToExactMiner,
  calculateExactTokensToMiner,
  getMinerToETH,
} from "./utils/xrates";
import {
  getBestPricePathExactIn,
  getBestPricePathExactOut,
} from "./utils/hops";
import fundDai from "./utils/fundDai";
import { testConfig } from "../config";
import { EXACT_MINER_OUT } from "./utils/constants";
import { smock } from "@defi-wonderland/smock";

// @TODO: Need to spread over two lines. ts-ignore can't handle multi-line.
// @ts-ignore
// prettier-ignore
// eslint-disable-next-line prettier/prettier
import type { MinerReserve, MinerIssuance, IUSDMinerPair } from "../typechain-types";

describe("MinerIssuance", () => {
  let deployer: string, owner: string, alice: string, bob: string;

  let miner: any,
    issuance: MinerIssuance,
    reserve: MinerReserve,
    aggregator: any,
    router: any,
    pair: IUSDMinerPair;

  const supply = ethers.utils.parseEther("1"); // EXACT_MINER_OUT;

  let deadline: number;

  let dai: any;

  before(async () => {
    ({ deployer, owner, alice, bob } = await getNamedAccounts());
  });

  beforeEach(async () => {
    await deployments.fixture(["all"]);

    // get some Dai.
    await fundDai();

    dai = getERC20Token(testConfig.currencies.dai);

    miner = getMiner();

    pair = await getPair();

    reserve = await ethers.getContract<MinerReserve>("MinerReserve");

    await miner.transfer(reserve.address, supply);

    router = getUniswapV2Router02();

    issuance = await ethers.getContract<MinerIssuance>("MinerIssuance");

    await reserve.grantRole(reserve.ISSUER_ROLE(), issuance.address);

    deadline = await getTwentyMinuteDeadline();

    aggregator = getAggregatorV3ETHUSD();
  });

  describe("instantiation", () => {
    it("should be able to change price feed oracle", async () => {
      await issuance.changePriceFeed(aggregator.address);

      expect(await issuance.priceFeed()).to.be.equal(aggregator.address);
    });

    it("should NOT be able to change price feed oracle without permission", async () => {
      await expect(
        issuance
          .connect(await ethers.getSigner(alice))
          .changePriceFeed(aggregator.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should be able to change pair", async () => {
      await issuance.changePair(aggregator.address);

      expect(await issuance.pair()).to.be.equal(aggregator.address);
    });

    it("should be able to change reserve", async () => {
      await issuance.changeReserve(reserve.address);

      expect(await issuance.reserve()).to.be.equal(reserve.address);
    });

    it("should NOT be able to change reserve if not owner", async () => {
      await expect(
        issuance
          .connect(await ethers.getSigner(alice))
          .changeReserve(reserve.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");

      expect(await issuance.reserve()).to.be.equal(reserve.address);
    });

    it("should NOT be able to change pair without permission", async () => {
      await expect(
        issuance
          .connect(await ethers.getSigner(alice))
          .changePair(aggregator.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should NOT be able to change router without permission", async () => {
      await expect(
        issuance
          .connect(await ethers.getSigner(alice))
          .changeUniswapRouter(aggregator.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should NOT be able to convert with a zero address price feed", async () => {
      await issuance.changePriceFeed(ethers.constants.AddressZero);
      const amount = ethers.utils.parseEther("0.001");

      // set min miner out to 0 as it shouldn't reach any amount validation.
      await expect(
        issuance.issueMinerForExactETH(0, deadline, { value: amount })
      ).to.be.revertedWith("Issuance/no-oracle-set");
    });
  });

  describe("ownership", async () => {
    it("should transfer ownership", async () => {
      await issuance.transferOwnership(alice);
      const newOwner = await issuance.owner();

      expect(newOwner).to.be.equal(alice);
    });

    it("should emit OwnershipTransferred event", async () => {
      await expect(issuance.transferOwnership(alice))
        .to.emit(issuance, "OwnershipTransferred")
        .withArgs(deployer, alice);
    });
  });

  describe("swaps", () => {
    beforeEach(async () => {
      await issuance.changePriceFeed(aggregator.address);
    });

    describe("issuing miner for exact ETH", () => {
      const amount = ethers.utils.parseEther("0.001");
      let expectedRate: any, expected: any;

      let minerMin: BigNumber;

      beforeEach(async () => {
        minerMin = await issuance.calculateETHToMiner(amount);

        const roundData = await aggregator.latestRoundData();
        const answer = roundData[1];
        const xRate = await pair.getPrice();

        expectedRate = xRate
          .mul(ethers.utils.parseUnits("1", await aggregator.decimals()))
          .div(answer);

        expected = amount.mul(ethers.utils.parseEther("1")).div(expectedRate);
      });

      it("should compute ETH per miner", async () => {
        expect(await issuance.calculateETHPerMiner()).to.be.equal(expectedRate);
      });

      it("should issue miner for exact ETH", async () => {
        await issuance
          .connect(await ethers.getSigner(alice))
          .issueMinerForExactETH(minerMin, deadline, {
            value: amount,
          });

        const balance = await miner.balanceOf(alice);

        expect(balance).to.be.equal(expected);
      });

      it("should emit an Issued event", async () => {
        await expect(
          issuance
            .connect(await ethers.getSigner(alice))
            .issueMinerForExactETH(minerMin, deadline, {
              value: amount,
            })
        )
          .to.emit(issuance, "Issued")
          .withArgs(alice, reserve.address, amount, expected);
      });

      it("should NOT convert zero ETH", async () => {
        await expect(
          issuance
            .connect(await ethers.getSigner(alice))
            .issueMinerForExactETH(minerMin, deadline, {
              value: ethers.constants.Zero,
            })
        ).to.be.revertedWith("Issuance/deposit-invalid");
      });

      it("should NOT exceed issuing more miner than the reserve has available", async () => {
        // eat up the entire supply of reserve.
        await expect(
          issuance
            .connect(await ethers.getSigner(alice))
            .issueExactMinerForETH(supply.add(1), deadline, {
              value: await issuance.calculateMinerToETH(supply.add(1)),
            })
        ).to.be.revertedWith("Reserve/balance-exceeded");
      });

      it("should NOT issue when deadline expires", async () => {
        await helpers.time.increase(3600);

        await expect(
          issuance.issueMinerForExactETH(minerMin, deadline, {
            value: ethers.utils.parseEther("10"),
          })
        ).to.be.revertedWith("Issuance/deadline-expired");
      });

      it("should NOT convert if price falls below slippage", async () => {
        // increase the min miner beyond what will be swapped.
        const minerMin = (await issuance.calculateETHToMiner(amount)).add(1);

        await expect(
          issuance
            .connect(await ethers.getSigner(alice))
            .issueMinerForExactETH(minerMin, deadline, {
              value: amount,
            })
        ).to.be.revertedWith("Issuance/insufficient-amount-out");
      });
    });

    describe("issuing exact miner for ETH", () => {
      const exactMinerOut = EXACT_MINER_OUT;

      let expected: any;

      let maxEthIn: BigNumber;

      beforeEach(async () => {
        maxEthIn = await issuance.calculateMinerToETH(exactMinerOut);

        expected = EXACT_MINER_OUT;
      });

      it("should issue exact miner for ETH", async () => {
        await issuance
          .connect(await ethers.getSigner(alice))
          .issueExactMinerForETH(exactMinerOut, deadline, {
            value: maxEthIn,
          });

        const balance = await miner.balanceOf(alice);

        expect(balance).to.be.equal(expected);
      });

      it("should emit an Issued event", async () => {
        expect(
          await issuance
            .connect(await ethers.getSigner(alice))
            .issueExactMinerForETH(exactMinerOut, deadline, {
              value: maxEthIn,
            })
        )
          .to.emit(issuance, "Issued")
          .withArgs(alice, reserve.address, maxEthIn, expected);
      });

      it("should refund excess ETH", async () => {
        const ethBalance = await ethers.provider.getBalance(alice);

        const tx = await issuance
          .connect(await ethers.getSigner(alice))
          .issueExactMinerForETH(exactMinerOut, deadline, {
            value: maxEthIn.add(1),
          });

        const receipt = await tx.wait();

        const expected = ethBalance
          .sub(maxEthIn)
          .sub(receipt.gasUsed.mul(receipt.effectiveGasPrice));

        const balance = await ethers.provider.getBalance(alice);

        expect(balance).to.be.equal(expected);
      });

      it("should NOT issue when deadline expires", async () => {
        await helpers.time.increase(3600);

        await expect(
          issuance.issueExactMinerForETH(exactMinerOut, deadline, {
            value: maxEthIn,
          })
        ).to.be.revertedWith("Issuance/deadline-expired");
      });

      it("should NOT convert zero ETH", async () => {
        await expect(
          issuance
            .connect(await ethers.getSigner(alice))
            .issueExactMinerForETH(exactMinerOut, deadline, {
              value: ethers.constants.Zero,
            })
        ).to.be.revertedWith("Issuance/deposit-invalid");
      });

      it("should NOT convert if max ETH cannot be met", async () => {
        await expect(
          issuance
            .connect(await ethers.getSigner(alice))
            .issueExactMinerForETH(exactMinerOut, deadline, {
              value: maxEthIn.sub(1),
            })
        ).to.be.revertedWith("Issuance/excessive-amount-in");
      });

      it("should NOT issue if excess ETH cannot be refunded", async () => {
        const senderFake = await smock.fake([]);

        const tx = {
          to: senderFake.address,
          value: ethers.utils.parseEther("10"),
        };

        await (await ethers.getSigner(alice)).sendTransaction(tx);

        senderFake.fallback.reverts();

        await expect(
          issuance
            .connect(await ethers.getSigner(senderFake.address))
            .issueExactMinerForETH(exactMinerOut, deadline, {
              value: maxEthIn.add(1),
            })
        ).to.be.revertedWith("Issuance/cannot-refund-ether");
      });

      it("should NOT be able to re-enter issuance infinitely", async () => {
        const senderMockFactory = await smock.mock("SenderMock");
        const senderMock = await senderMockFactory.deploy(issuance.address);
        // const senderFake = await smock.fake([]);

        const tx = {
          to: senderMock.address,
          value: ethers.utils.parseEther("10"),
        };

        await (await ethers.getSigner(alice)).sendTransaction(tx);

        await expect(
          issuance
            .connect(await ethers.getSigner(senderMock.address))
            .issueExactMinerForETH(exactMinerOut, deadline, {
              value: maxEthIn.add(1),
            })
        ).to.be.revertedWith("Issuance/cannot-refund-ether");
      });
    });

    describe("issuing miner for exact tokens", async () => {
      const exactTokensIn = ethers.utils.parseEther("1");

      let minerMinOut: BigNumber;
      let requiredETHIn: BigNumber;
      let path: string[];

      beforeEach(async () => {
        path = await getBestPricePathExactIn(
          exactTokensIn,
          testConfig.currencies.dai,
          await router.WETH()
        );

        const amounts = await router.getAmountsOut(exactTokensIn, path);
        requiredETHIn = amounts[amounts.length - 1];

        minerMinOut = await calculateExactTokensToMiner(
          testConfig.currencies.dai,
          exactTokensIn
        );
      });

      it("should swap dai for miner", async () => {
        const balance = await miner.balanceOf(deployer);

        const expected = minerMinOut.add(balance);

        await dai.approve(issuance.address, exactTokensIn);

        await issuance.issueMinerForExactTokens(
          path,
          exactTokensIn,
          minerMinOut,
          deadline
        );

        expect(await miner.balanceOf(deployer)).to.be.equal(expected);
      });

      it("should emit an Issued event", async () => {
        await dai.approve(issuance.address, exactTokensIn);

        await expect(
          issuance.issueMinerForExactTokens(
            path,
            exactTokensIn,
            minerMinOut,
            deadline
          )
        )
          .to.emit(issuance, "Issued")
          .withArgs(deployer, reserve.address, exactTokensIn, minerMinOut);
      });

      // TODO: Should this be moved to escrow?
      it("should have an Ether balance in MinerIssuance", async () => {
        const expected = requiredETHIn;

        const initialBalance = await issuance.payments(deployer);

        await dai.approve(issuance.address, exactTokensIn);

        await issuance.issueMinerForExactTokens(
          path,
          exactTokensIn,
          minerMinOut,
          deadline
        );

        await issuance.payments(deployer);
        let balance = await issuance.payments(deployer);

        balance = balance.sub(initialBalance);

        expect(balance).to.be.equal(expected);
      });

      it("should NOT swap when deadline expires", async () => {
        await dai.approve(issuance.address, exactTokensIn, {
          from: deployer,
        });

        await helpers.time.increase(30 * 60);

        await expect(
          issuance.issueMinerForExactTokens(
            path,
            exactTokensIn,
            minerMinOut,
            deadline
          )
        ).to.be.revertedWith("UniswapV2Router: EXPIRED");
      });

      it("should NOT swap invalid token", async () => {
        await dai.approve(issuance.address, exactTokensIn);

        await expect(
          issuance.issueMinerForExactTokens(
            [issuance.address],
            exactTokensIn,
            minerMinOut,
            deadline
          )
        ).to.be.revertedWith("UniswapV2Library: INVALID_PATH");
      });

      it("should return tokens if deadline expires", async () => {
        const expected = await dai.balanceOf(deployer);

        await dai.approve(issuance.address, exactTokensIn, {
          from: deployer,
        });

        await helpers.time.increase(30 * 60);

        await expect(
          issuance.issueMinerForExactTokens(
            path,
            exactTokensIn,
            minerMinOut,
            deadline
          )
        ).to.be.revertedWith("UniswapV2Router: EXPIRED");

        expect(await dai.balanceOf(deployer)).to.be.equal(expected);
      });

      it("should NOT swap if price falls below slippage", async () => {
        await dai.approve(issuance.address, exactTokensIn);

        // increase the min miner beyond what will be swapped.
        const slippageMin = minerMinOut.add(ethers.utils.parseEther("1"));

        await expect(
          issuance.issueMinerForExactTokens(
            path,
            exactTokensIn,
            slippageMin,
            deadline
          )
        ).revertedWith("Issuance/insufficient-amount-out");
      });

      it("should revert if invalid ETH transferred", async () => {
        const iface = router.interface;
        const routerFake = await smock.fake(
          JSON.parse(iface.format(ethers.utils.FormatTypes.json))
        );

        const amounts = await router.getAmountsOut(exactTokensIn, path);

        routerFake.getAmountsOut.returns(amounts);
        routerFake.swapExactTokensForETH.returns(amounts);

        await issuance.changeUniswapRouter(routerFake.address);

        await dai.approve(issuance.address, exactTokensIn);

        await expect(
          issuance.issueMinerForExactTokens(
            path,
            exactTokensIn,
            minerMinOut,
            deadline
          )
        ).revertedWith("Issuance/invalid-eth-amount");
      });
    });

    describe("issuing exact miner for tokens", async () => {
      let maxTokensIn: BigNumber;
      let path: string[];

      beforeEach(async () => {
        path = await getBestPricePathExactOut(
          await getMinerToETH(EXACT_MINER_OUT),
          testConfig.currencies.dai,
          await router.WETH()
        );

        maxTokensIn = await calculateTokensToExactMiner(
          dai.address,
          EXACT_MINER_OUT
        );
      });

      it("should issue exact Miner for Dai", async () => {
        const balance = await miner.balanceOf(deployer);

        const expected = balance.add(EXACT_MINER_OUT);

        await dai.approve(issuance.address, maxTokensIn);

        await issuance.issueExactMinerForTokens(
          path,
          maxTokensIn,
          EXACT_MINER_OUT,
          deadline
        );

        expect(await miner.balanceOf(deployer)).to.be.equal(expected);
      });

      it("should emit a Swapped Token for Miner event", async () => {
        await dai.approve(issuance.address, maxTokensIn);

        await expect(
          issuance.issueExactMinerForTokens(
            path,
            maxTokensIn,
            EXACT_MINER_OUT,
            deadline
          )
        )
          .to.emit(issuance, "Issued")
          .withArgs(deployer, reserve.address, maxTokensIn, EXACT_MINER_OUT);
      });

      it("should NOT swap if price falls below slippage", async () => {
        await dai.approve(issuance.address, maxTokensIn);

        await expect(
          issuance.issueExactMinerForTokens(
            path,
            maxTokensIn.sub(1),
            EXACT_MINER_OUT,
            deadline
          )
        ).revertedWith("Issuance/excessive-amount-in");
      });

      it("should revert if invalid ETH transferred", async () => {
        const iface = router.interface;
        const routerFake = await smock.fake(
          JSON.parse(iface.format(ethers.utils.FormatTypes.json))
        );

        const amounts = await router.getAmountsIn(
          await getMinerToETH(EXACT_MINER_OUT),
          path
        );

        routerFake.getAmountsIn.returns(amounts);
        routerFake.swapTokensForExactETH.returns(amounts);

        await issuance.changeUniswapRouter(routerFake.address);

        await dai.approve(issuance.address, maxTokensIn);

        await expect(
          issuance.issueExactMinerForTokens(
            path,
            maxTokensIn,
            EXACT_MINER_OUT,
            deadline
          )
        ).revertedWith("Issuance/invalid-eth-amount");
      });
    });

    describe("escrow", () => {
      it("should withdraw to owner only", async () => {
        await issuance.transferOwnership(owner);

        const wei = ethers.utils.parseEther("0.001");

        const balanceBeforeWithdrawal = await ethers.provider.getBalance(owner);

        await issuance
          .connect(await ethers.getSigner(alice))
          .issueMinerForExactETH(0, deadline, {
            value: wei,
          });

        await issuance.withdrawPayments(owner);

        const balanceAfterWithdrawal = await ethers.provider.getBalance(owner);

        const expected = balanceBeforeWithdrawal.add(wei);

        expect(expected).to.be.equal(balanceAfterWithdrawal);
      });

      it("should NOT withdraw eth swap balance to bob", async () => {
        const wei = ethers.utils.parseEther("0.001");

        const balanceBeforeWithdrawal = await ethers.provider.getBalance(bob);

        await issuance
          .connect(await ethers.getSigner(alice))
          .issueMinerForExactETH(0, deadline, {
            value: wei,
          });

        await issuance.withdrawPayments(bob);

        const balanceAfterWithdrawal = await ethers.provider.getBalance(bob);

        expect(balanceBeforeWithdrawal).to.be.equal(balanceAfterWithdrawal);
      });
    });
  });
});
