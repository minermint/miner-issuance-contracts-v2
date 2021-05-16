const {
    BN,
    constants,
    expectEvent,
    expectRevert,
    time
} = require("@openzeppelin/test-helpers");

const { expect } = require("chai");
const { ZERO_ADDRESS } = constants;

const BigNumber = require('bignumber.js');

const Miner = artifacts.require("Miner");
const Issuance = artifacts.require("Issuance");
const MinerUSDOracle = artifacts.require("MinerUSDOracle");
const MinerSwap = artifacts.require("MinerSwap");
const Dai = artifacts.require("DaiMock");
const UniswapV2Router02 = artifacts.require("UniswapV2Router02Mock");
const PriceFeedETH = artifacts.require("PriceFeedETHMock");
const Web3 = require("web3");

contract("MinerSwap", (accounts) => {
    const OWNER = accounts[0];
    const MINTER = accounts[1];
    const OWNER_2 = accounts[2];

    const ALICE = accounts[3];
    const BOB = accounts[4];

    const ZERO_BALANCE = new BN(0);

    const EXCHANGE_RATE = new BN("124000000"); // $1.24 to 8 dp.

    let miner, minerSwap, issuance, aggregator, router;

    const decimals = new BN("18");
    const supply = new BN("1000000").mul(new BN("10").pow(decimals));

    let deadline;

    beforeEach(async () => {
        miner = await Miner.new();
        await miner.setMinter(MINTER);

        oracle = await MinerUSDOracle.new();
        oracle.setExchangeRate(EXCHANGE_RATE);

        issuance = await Issuance.new(miner.address);

        await miner.mint(supply, { from: MINTER });
        await miner.transfer(issuance.address, supply, { from: MINTER });

        router = await UniswapV2Router02.deployed();
        await router.sendTransaction({
            from: OWNER,
            value: web3.utils.toWei("2", "ether")
        });

        minerSwap = await MinerSwap.new(
            oracle.address,
            issuance.address,
            router.address
        );

        issuance.addIssuer(minerSwap.address);

        const timestamp = (await web3.eth.getBlock("latest")).timestamp;
        const twentyMinutes = 20 * 60;
        deadline = timestamp + twentyMinutes;

        aggregator = await PriceFeedETH.deployed();
    });

    describe("instantiation", () => {
        it("should be able to change price feed oracle", async () => {
            await minerSwap.setPriceFeedOracle(aggregator.address);

            expect(await minerSwap.priceFeedOracle())
                .to
                .be
                .bignumber
                .equal(aggregator.address);
        });

        it("should NOT be able to change price feed oracle without permission",
        async () => {
            await expectRevert(
                minerSwap.setPriceFeedOracle(aggregator.address, { from: ALICE }),
                "Ownable: caller is not the owner"
            );
        });

        it("should be able to change miner oracle", async () => {
            await minerSwap.setMinerOracle(aggregator.address);

            expect(await minerSwap.minerOracle())
                .to
                .be
                .bignumber
                .equal(aggregator.address);
        });

        it("should NOT be able to change miner oracle without permission",
        async () => {
            await expectRevert(
                minerSwap.setMinerOracle(aggregator.address, { from: ALICE }),
                "Ownable: caller is not the owner"
            );
        });

        it("should NOT be able to convert with a zero address price feed",
        async () => {
            const amount = web3.utils.toWei("1", "ether");

            await expectRevert(
                minerSwap.swapEthToMiner(0, deadline, { value: amount }),
                "MinerSwap/no-oracle-set"
            );
        });
    });

    describe("ownership", async () => {
        it("should transfer ownership",
        async () => {
            await minerSwap.transferOwnership(ALICE);
            const newOwner = await minerSwap.owner();

            expect(newOwner).to.be.equal(ALICE);
        });

        it('should emit OwnershipTransferred event', async () => {
            const { logs } = await minerSwap.transferOwnership(ALICE);

            const event = expectEvent.inLogs(logs, 'OwnershipTransferred', {
                previousOwner: OWNER,
                newOwner: ALICE,
            });
        });
    });

    describe("swaps", () => {
        beforeEach(async () => {
            await minerSwap.setPriceFeedOracle(aggregator.address);
        });

        describe("converting eth for miner", () => {
            const amount = web3.utils.toWei("1", "ether");
            let expectedRate, expected;

            beforeEach(async () => {
                const roundData = await aggregator.latestRoundData();
                const answer = new web3.utils.BN(roundData[1]);
                const xRate = await oracle.getLatestExchangeRate();

                expectedRate = new BN(web3.utils.toWei(xRate[0], "ether")).div(answer);

                // buffer the amount with 18 zeros so we get back an expected
                // amount in wei.
                expected = new BN(web3.utils.toWei(amount)).div(expectedRate);
            });

            it("should get the conversion rate", async () => {
                const swapped = await minerSwap.calculateMinerPriceInEth();
                expect(swapped).to.be.bignumber.equal(expectedRate);
            });

            it("should get conversion amount", async () => {
                const swapped = await minerSwap.calculateEthToMinerSwap(amount);

                expect(swapped).to.be.bignumber.equal(expected);
            });

            it("should swap eth for miner", async () => {
                await minerSwap.swapEthToMiner(
                    0,
                    deadline,
                    {
                        from: ALICE,
                        value: amount
                    }
                );

                const balance = await miner.balanceOf(ALICE);

                expect(balance).to.be.bignumber.equal(expected);
            });

            it("should emit a Swapped Eth to Miner event", async () => {
                const { logs } = await minerSwap.swapEthToMiner(
                    0,
                    deadline,
                    {
                        from: ALICE,
                        value: amount
                    }
                );

                expectEvent.inLogs(logs, 'SwappedEthToMiner', {
                    recipient: ALICE,
                    sender: issuance.address,
                    amountIn: amount,
                    amountOut: expected.toString()
                });
            });

            it("should NOT convert zero tokens", async () => {
                await expectRevert(
                    minerSwap.swapEthToMiner(
                        0,
                        deadline,
                        {
                            from: ALICE,
                            value: web3.utils.toWei(ZERO_BALANCE, "ether")
                        }
                    ),
                    "MinerSwap/deposit-invalid"
                );
            });

            it("should NOT exceed converting more tokens than are available",
            async () => {
                await expectRevert(
                    minerSwap.swapEthToMiner(
                        0,
                        deadline,
                        {
                            from: ALICE,
                            value: web3.utils.toWei(supply + 1, "ether")
                        }
                    ),
                    "Issuance/balance-exceeded"
                );
            });

            it("should NOT convert if rate is zero",
            async () => {
                oracle.setExchangeRate(ZERO_BALANCE);

                await expectRevert(
                    minerSwap.swapEthToMiner(
                        0,
                        deadline,
                        {
                            from: ALICE,
                            value: web3.utils.toWei("10", "ether")
                        }
                    ),
                    "SafeMath: division by zero -- Reason given: SafeMath: division by zero."
                );
            });

            it("should NOT convert if price falls below slippage", async () => {
                // increase the min miner beyond what will be swapped.
                const minerMin = (await minerSwap.getEthToMiner(amount)).add(new web3.utils.BN(1));

                await expectRevert(
                    minerSwap.swapEthToMiner(
                        minerMin,
                        deadline,
                        {
                            from: ALICE,
                            value: amount
                        }
                    ),
                    "MinerSwap/slippage"
                );
            });
        });

        describe("swapping tokens for miner", async() => {
            const amount = new BN("10").mul(new BN("10").pow(new BN("18")));

            let dai;

            let minerMin;

            beforeEach(async () => {
                dai = await Dai.deployed();
                minerMin = await minerSwap.calculateTokenToMinerSwap(dai.address, amount);
            });

            describe("checking mock setup", async() => {
                it("should have a Miner to USD price of 1.24 USD",
                    async () => {
                    const xRate = await oracle.getLatestExchangeRate();
                    const usdPerMiner = xRate[0];

                    expect(usdPerMiner).to.be.bignumber.equal(EXCHANGE_RATE);
                });

                it("should have an exchange rate of 1 Dai for 0.001 eth",
                    async () => {
                    const expected = new BN("1").mul(new BN("10").pow(new BN("15")));

                    const amountIn = new BN("1").mul(new BN("10").pow(new BN("18")));
                    const actual = await minerSwap.calculateTokenToEthSwap(dai.address, amountIn);

                    expect(actual).to.be.bignumber.equal(expected);
                });
            });

            it("should get the conversion rate", async () => {
                path = [];
                path[0] = await router.WETH();
                path[1] = dai.address;

                const ethPerToken = await minerSwap.calculateEthToTokenSwap(dai.address, amount);
                // 1/1000 USD * 10^18 wei or 0.001 ETH

                const minerUSDRate = await oracle.getLatestExchangeRate();
                const usdPerMiner = minerUSDRate[0];
                // 124000000 cents to the 8 dp or 1.24 USD

                const roundData = await aggregator.latestRoundData();
                const usdPerEth = roundData[1];
                // 1000 USD per ETH

                const ethPerMiner = new BN(web3.utils.toWei(usdPerMiner, "ether")).div(usdPerEth);
                // (124000000 / 1000^10*8 or 1.24 / 1000 ETH per MINER

                const amountsOut = await router.getAmountsOut(ethPerMiner, path);
                const expected = amountsOut[1];

                const converted = await minerSwap.calculateMinerPriceInToken(dai.address);

                expect(swapped).to.be.bignumber.equal(expected);
            });

            it("should convert a token for miner", async () => {
                const balance = await miner.balanceOf(OWNER);

                const expected = minerMin.add(balance);

                await dai.approve(minerSwap.address, amount, { from: OWNER });

                await minerSwap.swapTokenToMiner(dai.address, amount, minerMin, deadline, {
                    from: OWNER
                });

                expect(await miner.balanceOf(OWNER)).to.be.bignumber.equal(expected);
            });

            it("should emit a Swapped Token for Miner event", async () => {
                const balance = await miner.balanceOf(OWNER);

                const expected = minerMin.add(balance);

                await dai.approve(minerSwap.address, amount, { from: OWNER });

                const { logs } = await minerSwap.swapTokenToMiner(
                    dai.address,
                    amount,
                    minerMin,
                    deadline,
                    { from: OWNER }
                );

                expectEvent.inLogs(logs, "SwappedTokenToMiner", {
                    amountIn: amount,
                    amountOut: expected,
                    token: dai.address,
                });
            });

            it("should have an Ether balance in MinerSwap", async() => {
                const expected = await minerSwap.calculateTokenToEthSwap(dai.address, amount);

                const initialBalance = await minerSwap.payments(OWNER);

                await dai.approve(minerSwap.address, amount, { from: OWNER });

                await minerSwap.swapTokenToMiner(dai.address, amount, minerMin, deadline, {
                    from: OWNER
                });

                await minerSwap.payments(OWNER);
                let balance = await minerSwap.payments(OWNER);

                balance = balance.sub(initialBalance);

                expect(balance).to.be.bignumber.equal(expected);
            });

            describe("calculating swaps", async () => {
                let uniswapV2Router, path;

                beforeEach(async () => {
                    path = [];
                    path[0] = dai.address;
                    path[1] = await router.WETH();
                });

                it("should get the amount of token required to convert to eth", async () => {
                    const actual = await minerSwap.calculateTokenToEthSwap(dai.address, amount, {
                        from: OWNER,
                    });

                    const amounts = await router.getAmountsOut(amount, path);
                    const expected = amounts[path.length - 1];

                    expect(actual).to.be.bignumber.equal(expected);
                });

                it("should get the amount of token require to convert to miner", async () => {
                    const actual = await minerSwap.calculateTokenToMinerSwap(dai.address, amount, {
                        from: OWNER,
                    });

                    const amounts = await router.getAmountsOut(amount, path);

                    const ethPerMiner = await minerSwap.calculateEthPerMiner();
                    const decimals = new BN("10").pow(new BN("18"));

                    const expected = amounts[path.length - 1]
                        .mul(decimals)
                        .div(ethPerMiner);

                    expect(actual).to.be.bignumber.equal(expected);
                });
            });

            it("should NOT swap when deadline expires", async () => {
                await dai.approve(minerSwap.address, amount, { from: OWNER });

                time.increase(time.duration.minutes(30));

                await expectRevert(
                    minerSwap.swapTokenToMiner(dai.address, amount, minerMin, deadline, {
                        from: OWNER,
                    }),
                    "UniswapV2Router: EXPIRED"
                );
            });

            it("should NOT swap invalid token", async () => {
                await dai.approve(minerSwap.address, amount, { from: OWNER });

                await expectRevert.unspecified(
                    minerSwap.swapTokenToMiner(
                        ZERO_ADDRESS,
                        amount,
                        amount,
                        deadline,
                        { from: OWNER }
                    )
                );
            });

            it("should return tokens if deadline expires", async () => {
                const expected = await dai.balanceOf(OWNER);

                await dai.approve(minerSwap.address, amount, { from: OWNER });

                time.increase(time.duration.minutes(30));

                await expectRevert(
                    minerSwap.swapTokenToMiner(dai.address, amount, minerMin, deadline, {
                        from: OWNER,
                    }),
                    "UniswapV2Router: EXPIRED"
                );

                expect(await dai.balanceOf(OWNER)).to.be.bignumber.equal(expected);
            });
        });

        describe("escrow", () => {
            it("should withdraw to owner only",
            async () => {
                await minerSwap.transferOwnership(OWNER_2);

                const wei = web3.utils.toWei("1", "ether");

                const balanceBeforeWithdrawal = new web3.utils
                    .BN(await web3.eth.getBalance(OWNER_2));

                await minerSwap.swapEthToMiner(
                    0,
                    deadline,
                    { from: ALICE, value: wei }
                );

                await minerSwap.withdrawPayments(OWNER_2);

                const balanceAfterWithdrawal = new web3.utils.BN(
                    await web3.eth.getBalance(OWNER_2)
                );

                const expected = balanceBeforeWithdrawal.add(
                    new web3.utils.BN(wei)
                );

                expect(expected).to.be.bignumber.equal(balanceAfterWithdrawal);
            });

            it("should NOT withdraw eth swap balance to BOB", async () => {
                const wei = web3.utils.toWei("1", "ether");

                const balanceBeforeWithdrawal = new web3.utils.BN(
                    await web3.eth.getBalance(BOB)
                );

                await minerSwap.swapEthToMiner(
                    0,
                    deadline,
                    {
                        from: ALICE,
                        value: wei
                    }
                );

                await minerSwap.withdrawPayments(BOB);

                const balanceAfterWithdrawal = new web3.utils.BN(
                    await web3.eth.getBalance(BOB)
                );

                expect(balanceBeforeWithdrawal).to.be.bignumber.equal(balanceAfterWithdrawal);
            });
        });
    });
});
