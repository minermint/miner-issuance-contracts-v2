const { BN, constants, expectEvent, expectRevert } = require("@openzeppelin/test-helpers");
const { expect } = require("chai");
const { ZERO_ADDRESS } = constants;

const Miner = artifacts.require("Miner");
const Issuance = artifacts.require("Issuance");
const MinerUSDOracle = artifacts.require("MinerUSDOracle");
const PriceFeed = artifacts.require("PriceFeedETH");
const EthSwap = artifacts.require("EthSwap");

contract("EthSwap", (accounts) => {
    const OWNER = accounts[0];
    const MINTER = accounts[1];
    const OWNER_2 = accounts[2];

    const ALICE = accounts[3];
    const BOB = accounts[4];

    const ZERO_BALANCE = new BN(0);

    const EXCHANGE_RATE = new BN("150000000"); // $1.50 to 8 dp.

    let miner, issuance, swapEth;

    const decimals = new BN("18");
    const supply = new BN("1000").mul(new BN("10").pow(decimals));

    const oracleAddress = "0x9326BFA02ADD2366b30bacB125260Af641031331";

    beforeEach(async () => {
        miner = await Miner.new();
        await miner.setMinter(MINTER);

        aggregator = await PriceFeed.deployed();
        oracle = await MinerUSDOracle.deployed();

        oracle.setExchangeRate(EXCHANGE_RATE);

        issuance = await Issuance.new(miner.address);

        await miner.mint(supply, { from: MINTER });
        await miner.transfer(issuance.address, supply, { from: MINTER });

        ethSwap = await EthSwap.new(oracle.address, issuance.address);
        issuance.addIssuer(ethSwap.address);
    });

    describe("instantiation", () => {
        it("should be able to change price feed oracle", async () => {
            await ethSwap.setPriceFeedOracle(oracleAddress);

            expect(await ethSwap.priceFeedOracle())
                .to
                .be
                .bignumber
                .equal(oracleAddress);
        });

        it("should NOT be able to change price feed oracle without permission",
        async () => {
            await expectRevert(
                ethSwap.setPriceFeedOracle(oracleAddress, { from: ALICE }),
                "Issuance/no-admin-privileges"
            );
        });

        it("should be able to change miner oracle", async () => {
            await ethSwap.setMinerOracle(oracleAddress);

            expect(await ethSwap.minerOracle())
                .to
                .be
                .bignumber
                .equal(oracleAddress);
        });

        it("should NOT be able to change miner oracle without permission",
        async () => {
            await expectRevert(
                ethSwap.setMinerOracle(oracleAddress, { from: ALICE }),
                "Issuance/no-admin-privileges"
            );
        });

        it("should NOT be able to convert with a zero address price feed",
        async () => {
            const amount = web3.utils.toWei("1", "ether");

            await expectRevert(
                ethSwap.convert(0, { value: amount }),
                "EthSwap/no-oracle-set"
            );
        });
    });

    describe("swapping ether for miner", () => {
        const expected = new BN("235320000000000048297");

        beforeEach(async () => {
            ethSwap.setPriceFeedOracle(aggregator.address);
        });


        describe("converting eth for miner", () => {
            it("should get conversion rate", async () => {
                const amount = web3.utils.toWei("1", "ether");
                const converted = await ethSwap.getConversionAmount(amount);

                expect(converted).to.be.bignumber.equal(expected);
            });

            it("should swap eth for miner", async () => {
                const amount = web3.utils.toWei("1", "ether");

                await ethSwap.convert(
                    0,
                    {
                        from: ALICE,
                        value: amount
                    }
                );

                const balance = await miner.balanceOf(ALICE);

                expect(balance).to.be.bignumber.equal(expected);
            });

            it("should emit a Converted event", async () => {
                const { logs } = await ethSwap.convert(
                    0,
                    {
                        from: ALICE,
                        value: web3.utils.toWei("1", "ether")
                    }
                );

                expectEvent.inLogs(logs, 'Converted', {
                    recipient: ALICE,
                    sender: issuance.address,
                    sent: web3.utils.toWei("1", "ether"),
                    received: expected.toString()
                });
            });

            it("should NOT convert zero tokens", async () => {
                await expectRevert(
                    ethSwap.convert(
                        0,
                        {
                            from: ALICE,
                            value: web3.utils.toWei(ZERO_BALANCE, "ether")
                        }
                    ),
                    "EthSwap/deposit-invalid"
                );
            });

            it("should NOT exceed converting more tokens than are available",
            async () => {
                await expectRevert(
                    ethSwap.convert(
                        0,
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
                    ethSwap.convert(
                        0,
                        {
                            from: ALICE,
                            value: web3.utils.toWei("10", "ether")
                        }
                    ),
                    "SafeMath: division by zero -- Reason given: SafeMath: division by zero."
                );
            });
        });

        describe("escrow", () => {
            it("should withdraw to owner only",
            async () => {
                await ethSwap.transferOwnership(OWNER_2);

                const wei = web3.utils.toWei("1", "ether");

                const balanceBeforeWithdrawal = new web3.utils
                    .BN(await web3.eth.getBalance(OWNER_2));

                await ethSwap.convert(0, { from: ALICE, value: wei });

                await ethSwap.withdrawPayments(OWNER_2);

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

                await ethSwap.convert(
                    0,
                    {
                        from: ALICE,
                        value: wei
                    }
                );

                await ethSwap.withdrawPayments(BOB);

                const balanceAfterWithdrawal = new web3.utils.BN(
                    await web3.eth.getBalance(BOB)
                );

                expect(balanceBeforeWithdrawal).to.be.bignumber.equal(balanceAfterWithdrawal);
            });
        });
    });

    describe("access control", async () => {
        const ADMIN = web3.utils.soliditySha3("ADMIN");

        it("should transfer ownership and set the new owner as an admin",
        async () => {
            await ethSwap.transferOwnership(ALICE);
            const newOwner = await ethSwap.owner();
            const isAdmin = await ethSwap.hasRole(ADMIN, ALICE);

            expect(newOwner).to.be.equal(ALICE);
            expect(isAdmin).to.be.true;
        });

        it('should emit OwnershipTransferred event', async () => {
            const { logs } = await ethSwap.transferOwnership(ALICE);

            const event = expectEvent.inLogs(logs, 'OwnershipTransferred', {
                previousOwner: OWNER,
                newOwner: ALICE,
            });
        });
    });
});
