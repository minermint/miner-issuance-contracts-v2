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

    const ALICE = accounts[3];
    const BOB = accounts[4];

    const ZERO_BALANCE = new BN(0);

    const EXCHANGE_RATE = new BN("150000000"); // $1.50 to 8 dp.

    let miner, issuance, swapEth;

    const decimals = new BN("18");
    const supply = new BN("1000").mul(new BN("10").pow(decimals));

    beforeEach(async () => {
        miner = await Miner.new();
        await miner.setMinter(MINTER);

        aggregator = await PriceFeed.deployed();
        oracle = await MinerUSDOracle.deployed();

        oracle.setExchangeRate(EXCHANGE_RATE);

        issuance = await Issuance.new(miner.address);

        await miner.mint(supply, { from: MINTER });
        await miner.transfer(issuance.address, supply, { from: MINTER });

        ethSwap = await EthSwap.new(oracle.address, aggregator.address, issuance.address);
        issuance.addIssuer(ethSwap.address);
    });

    it("should fund the token issuance", async () => {
        let actual = new BN(await miner.balanceOf(issuance.address));

        expect(actual).to.be.bignumber.equal(supply);
    });

    it("should be able to change contract ownership", async () => {
        await issuance.transferOwnership(ALICE);

        expect(await issuance.owner()).to.be.equal(ALICE);
    });

    describe("converting eth for miner", () => {
        const expected = new BN("235320000000000048297");

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

        it("should withdraw eth swap balance to BOB", async () => {
            const wei = web3.utils.toWei("1", "ether");

            let ownerBalanceBeforeWithdrawal = new web3.utils.BN(
                await web3.eth.getBalance(BOB)
            );

            await ethSwap.transferOwnership(BOB);

            await ethSwap.convert(
                0,
                {
                    from: ALICE,
                    value: wei
                }
            );

            await ethSwap.withdrawPayments(BOB);

            let ownerBalanceAfterWithdrawal = new web3.utils.BN(
                await web3.eth.getBalance(BOB)
            );

            const expected = ownerBalanceBeforeWithdrawal.add(
                new web3.utils.BN(wei)
            );

            expect(expected).to.be.bignumber.equal(ownerBalanceAfterWithdrawal);
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
});
