const { BN, constants, expectEvent, expectRevert } = require("@openzeppelin/test-helpers");
const { expect } = require("chai");
const { ZERO_ADDRESS } = constants;

const Miner = artifacts.require("Miner");
const Issuance = artifacts.require("Issuance");
const MinerOracle = artifacts.require("MinerOracle");
const PriceFeed = artifacts.require("PriceFeed");

contract("Issuance", (accounts) => {
    const OWNER = accounts[0];
    const MINTER = accounts[1];

    const ALICE = accounts[3];
    const BOB = accounts[4];

    const ZERO_BALANCE = new BN(0);

    const CURRENCY_CODE = "USD";
    const EXCHANGE_RATE = new BN("150000000"); // $1.50 to 8 dp.

    let miner, issuance;

    const decimals = new BN("18");
    const supply = new BN("1000").mul(new BN("10").pow(decimals));

    beforeEach(async () => {
        miner = await Miner.new();
        await miner.setMinter(MINTER);

        aggregator = await PriceFeed.new();
        oracle = await MinerOracle.new();

        oracle.setExchangeRate(CURRENCY_CODE, EXCHANGE_RATE);

        issuance = await Issuance.new(miner.address);
        issuance.setMinerOracle(oracle.address);
        issuance.setPriceFeedOracle(aggregator.address);

        await miner.mint(supply, { from: MINTER });
        await miner.transfer(issuance.address, supply, { from: MINTER });
    });

    it("should fund the token issuance", async () => {
        let actual = new BN(await miner.balanceOf(issuance.address));

        expect(actual).to.be.bignumber.equal(supply);
    });

    it("should be able to change contract ownership", async () => {
        await issuance.transferOwnership(ALICE);

        expect(await issuance.owner()).to.be.equal(ALICE);
    });

    describe("purchasing miner", () => {
        const expected = new BN("235320000000000048297");

        it("should get conversion rate", async () => {
            const amount = web3.utils.toWei("1", "ether");
            const converted = await issuance.convert(amount);

            expect(converted).to.be.bignumber.equal(expected);
        });

        it("should issue miner tokens", async () => {
            await issuance.issue(
                {
                    from: ALICE,
                    value: web3.utils.toWei("1", "ether")
                }
            );

            const balance = await miner.balanceOf(ALICE);

            expect(balance).to.be.bignumber.equal(expected);
        });

        it("should withdraw issuance balance to BOB", async () => {
            const wei = web3.utils.toWei("1", "ether");

            let ownerBalanceBeforeWithdrawal = new web3.utils.BN(
                await web3.eth.getBalance(BOB)
            );

            await issuance.transferOwnership(BOB);

            await issuance.issue(
                {
                    from: ALICE,
                    value: wei
                }
            );

            await issuance.withdrawPayments(BOB);

            let ownerBalanceAfterWithdrawal = new web3.utils.BN(
                await web3.eth.getBalance(BOB)
            );

            const expected = ownerBalanceBeforeWithdrawal.add(
                new web3.utils.BN(wei)
            );

            expect(expected).to.be.bignumber.equal(ownerBalanceAfterWithdrawal);
        });

        it("should emit a Issued event", async () => {
            const { logs } = await issuance.issue(
                {
                    from: ALICE,
                    value: web3.utils.toWei("1", "ether")
                }
            );

            expectEvent.inLogs(logs, 'Issued', {
                sent: expected.toString(),
                received: web3.utils.toWei("1", "ether"),
                recipient: ALICE,
            });
        });

        it("should NOT issue zero tokens", async () => {
            await expectRevert(
                issuance.issue(
                    {
                        from: ALICE,
                        value: web3.utils.toWei(ZERO_BALANCE, "ether")
                    }
                ),
                "Issuance/deposit-invalid"
            );
        });

        it("should NOT exceed issuing more tokens than are available",
        async () => {
            await expectRevert(
                issuance.issue(
                    {
                        from: ALICE,
                        value: web3.utils.toWei("50", "ether")
                    }
                ),
                "Issuance/balance-exceeded"
            );
        });

        it("should NOT issue if rate is zero",
        async () => {
            oracle.setExchangeRate(CURRENCY_CODE, ZERO_BALANCE);

            await expectRevert(
                issuance.issue(
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
