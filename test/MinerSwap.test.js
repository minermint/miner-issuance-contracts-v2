const {
    BN,
    constants,
    expectEvent,
    expectRevert,
    time
} = require("@openzeppelin/test-helpers");

const { expect } = require("chai");
const { ZERO_ADDRESS } = constants;

const truffleContract = require("@truffle/contract");

const Miner = artifacts.require("Miner");
const Issuance = artifacts.require("Issuance");
const MinerUSDOracle = artifacts.require("MinerUSDOracle");
const PriceFeed = artifacts.require("PriceFeedETH");
const MinerSwap = artifacts.require("MinerSwap");
const ERC20Contract = require("@uniswap/v2-core/build/ERC20.json");
const UniSwapV2RouterMetadata = require("@uniswap/v2-periphery/build/UniswapV2Router02.json");
const Web3 = require("web3");

contract("MinerSwap", (accounts) => {
    const daiAddress = process.env.DAI;
    const uniswapRouterAddress = process.env.UNISWAP_ROUTER;

    const OWNER = accounts[0];
    const MINTER = accounts[1];
    const OWNER_2 = accounts[2];

    const ALICE = accounts[3];
    const BOB = accounts[4];

    const ZERO_BALANCE = new BN(0);

    const EXCHANGE_RATE = new BN("150000000"); // $1.50 to 8 dp.

    let miner, minerSwap, issuance;

    const decimals = new BN("18");
    const supply = new BN("1000").mul(new BN("10").pow(decimals));

    const oracleAddress = "0x9326BFA02ADD2366b30bacB125260Af641031331";

    let deadline;

    beforeEach(async () => {
        miner = await Miner.new();
        await miner.setMinter(MINTER);

        aggregator = await PriceFeed.deployed();
        oracle = await MinerUSDOracle.deployed();

        oracle.setExchangeRate(EXCHANGE_RATE);

        issuance = await Issuance.new(miner.address);

        await miner.mint(supply, { from: MINTER });
        await miner.transfer(issuance.address, supply, { from: MINTER });

        minerSwap = await MinerSwap.new(
            oracle.address,
            issuance.address,
            uniswapRouterAddress
        );

        issuance.addIssuer(minerSwap.address);

        const timestamp = (await web3.eth.getBlock("latest")).timestamp;
        const twentyMinutes = 20 * 60;
        deadline = timestamp + twentyMinutes;
    });

    describe("instantiation", () => {
        it("should be able to change price feed oracle", async () => {
            await minerSwap.setPriceFeedOracle(oracleAddress);

            expect(await minerSwap.priceFeedOracle())
                .to
                .be
                .bignumber
                .equal(oracleAddress);
        });

        it("should NOT be able to change price feed oracle without permission",
        async () => {
            await expectRevert(
                minerSwap.setPriceFeedOracle(oracleAddress, { from: ALICE }),
                "Ownable: caller is not the owner"
            );
        });

        it("should be able to change miner oracle", async () => {
            await minerSwap.setMinerOracle(oracleAddress);

            expect(await minerSwap.minerOracle())
                .to
                .be
                .bignumber
                .equal(oracleAddress);
        });

        it("should NOT be able to change miner oracle without permission",
        async () => {
            await expectRevert(
                minerSwap.setMinerOracle(oracleAddress, { from: ALICE }),
                "Ownable: caller is not the owner"
            );
        });

        it("should NOT be able to convert with a zero address price feed",
        async () => {
            const amount = web3.utils.toWei("1", "ether");

            await expectRevert(
                minerSwap.convertEthToMiner(0, deadline, { value: amount }),
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
        const expected = new BN("235320000000000048297");

        beforeEach(async () => {
            minerSwap.setPriceFeedOracle(aggregator.address);
        });

        describe("converting eth for miner", () => {
            it("should get the conversion rate", async () => {
                const converted = await minerSwap.getEthToMinerUnitPrice();

                const roundData = await aggregator.latestRoundData();
                const answer = new web3.utils.BN(roundData[1]);
                const xRate = await oracle.getLatestExchangeRate();

                const rate = web3.utils.toWei(xRate[0], "ether").div(answer);

                expect(converted).to.be.bignumber.equal(rate);
            });

            it("should get conversion amount", async () => {
                const amount = web3.utils.toWei("1", "ether");
                const converted = await minerSwap.getEthToMiner(amount);

                expect(converted).to.be.bignumber.equal(expected);
            });

            it("should swap eth for miner", async () => {
                const amount = web3.utils.toWei("1", "ether");

                await minerSwap.convertEthToMiner(
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

            it("should emit a Converted event", async () => {
                const { logs } = await minerSwap.convertEthToMiner(
                    0,
                    deadline,
                    {
                        from: ALICE,
                        value: web3.utils.toWei("1", "ether")
                    }
                );

                expectEvent.inLogs(logs, 'ConvertedEthToMiner', {
                    recipient: ALICE,
                    sender: issuance.address,
                    amountIn: web3.utils.toWei("1", "ether"),
                    amountOut: expected.toString()
                });
            });

            it("should NOT convert zero tokens", async () => {
                await expectRevert(
                    minerSwap.convertEthToMiner(
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
                    minerSwap.convertEthToMiner(
                        0,
                        deadline,
                        {
                            from: ALICE,
                            value: web3.utils.toWei("50", "ether")
                        }
                    ),
                    "Issuance/balance-exceeded"
                );
            });

            it("should NOT convert if rate is zero",
            async () => {
                oracle.setExchangeRate(ZERO_BALANCE);

                await expectRevert(
                    minerSwap.convertEthToMiner(
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
                const amount = web3.utils.toWei("1", "ether");

                // increase the min miner beyond what will be converted.
                const minerMin = (await minerSwap.getEthToMiner(amount)).add(new web3.utils.BN(1));

                await expectRevert(
                    minerSwap.convertEthToMiner(
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

            let ERC20;

            let dai;

            let minerMin;

            beforeEach(async () => {
                const provider = new Web3.providers.HttpProvider(
                    "http://localhost:8545"
                );
                ERC20 = truffleContract({ abi: ERC20Contract.abi });

                ERC20.setProvider(provider);

                dai = await ERC20.at(daiAddress);

                minerMin = await minerSwap.getTokenToMiner(dai.address, amount);
            });

            it("should convert a token for miner", async () => {
                const balance = await miner.balanceOf(OWNER);

                const expected = minerMin.add(balance);

                await dai.approve(minerSwap.address, amount, { from: OWNER });

                await minerSwap.convertTokenToMiner(dai.address, amount, minerMin, deadline, {
                    from: OWNER
                });

                expect(await miner.balanceOf(OWNER)).to.be.bignumber.equal(expected);
            });

            it("should emit a Converted Token for Miner event", async () => {
                const balance = await miner.balanceOf(OWNER);

                const expected = minerMin.add(balance);

                await dai.approve(minerSwap.address, amount, { from: OWNER });

                const { logs } = await minerSwap.convertTokenToMiner(
                    dai.address,
                    amount,
                    minerMin,
                    deadline,
                    { from: OWNER }
                );

                expectEvent.inLogs(logs, "ConvertedTokenToMiner", {
                    amountIn: amount,
                    amountOut: expected,
                    token: dai.address,
                });
            });

            it("should have an Ether balance in MinerSwap", async() => {
                const expected = await minerSwap.getTokenToEth(dai.address, amount);

                const initialBalance = await minerSwap.payments(OWNER);

                await dai.approve(minerSwap.address, amount, { from: OWNER });

                await minerSwap.convertTokenToMiner(dai.address, amount, minerMin, deadline, {
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
                    const provider = new Web3.providers.HttpProvider(
                        "http://localhost:8545"
                    );

                    const UniSwapV2Router = truffleContract({
                        abi: UniSwapV2RouterMetadata.abi,
                    });
                    UniSwapV2Router.setProvider(provider);
                    uniswapV2Router = await UniSwapV2Router.at(uniswapVRouterAddress);

                    path = [];
                    path[0] = dai.address;
                    path[1] = await uniswapV2Router.WETH();
                });

                it("should get the amount of token required to convert to eth", async () => {
                    const actual = await minerSwap.getTokenToEth(dai.address, amount, {
                        from: OWNER,
                    });

                    const amounts = await uniswapV2Router.getAmountsOut(amount, path);
                    const expected = amounts[path.length - 1];

                    expect(actual).to.be.bignumber.equal(expected);
                });

                it("should get the amount of token require to convert to miner", async () => {
                    const actual = await minerSwap.getTokenToMiner(dai.address, amount, {
                        from: OWNER,
                    });

                    const amounts = await uniswapV2Router.getAmountsOut(amount, path);

                    const ethToMinerUnitPrice = await minerSwap.getEthToMinerUnitPrice();
                    const decimals = new BN("10").pow(new BN("18"));

                    const expected = amounts[path.length - 1]
                        .mul(decimals)
                        .div(ethToMinerUnitPrice);

                    expect(actual).to.be.bignumber.equal(expected);
                });
            });

            it("should NOT swap when deadline expires", async () => {
                await dai.approve(minerSwap.address, amount, { from: OWNER });

                time.increase(time.duration.minutes(20));

                await expectRevert(
                    minerSwap.convertTokenToMiner(dai.address, amount, minerMin, deadline, {
                        from: OWNER,
                    }),
                    "UniswapV2Router: EXPIRED"
                );
            });

            it("should NOT swap invalid token", async () => {
                await dai.approve(minerSwap.address, amount, { from: OWNER });

                await expectRevert.unspecified(
                    minerSwap.convertTokenToMiner(
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

                time.increase(time.duration.minutes(20));

                await expectRevert(
                    minerSwap.convertTokenToMiner(dai.address, amount, minerMin, deadline, {
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

                await minerSwap.convertEthToMiner(
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

                await minerSwap.convertEthToMiner(
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
