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

    let miner, issuance;

    const decimals = new BN("18");
    const supply = new BN("1000").mul(new BN("10").pow(decimals));

    beforeEach(async () => {
        miner = await Miner.new();
        await miner.setMinter(MINTER);

        aggregator = await PriceFeed.new();
        oracle = await MinerOracle.new(aggregator.address);

        let minerUSD = new web3.utils.BN(150)
        let padding = new web3.utils.BN(10)
        padding = padding.pow(new web3.utils.BN(6));

        minerUSD = minerUSD.mul(padding);

        oracle.setMinerUSD(minerUSD);

        issuance = await Issuance.new(miner.address);
        issuance.setMinerOracle(oracle.address);
    });

    it("should fund the token issuance", async () => {
        await miner.mint(supply, { from: MINTER });
        await miner.transfer(issuance.address, supply, { from: MINTER });

        let actual = new BN(await miner.balanceOf(issuance.address));

        expect(actual).to.be.bignumber.equal(supply);
    });

    it("should be able to change contract ownership", async () => {
        await issuance.transferOwnership(ALICE);

        expect(await issuance.owner()).to.be.equal(ALICE);
    });

    describe("purchasing miner", () => {
        const amount = new BN("235320000000000048297");

        beforeEach(async () => {
            await miner.mint(supply, { from: MINTER });
            await miner.transfer(issuance.address, supply, { from: MINTER });
        });

        it("should issue miner tokens", async () => {
            await issuance.issue(
                {
                    from: ALICE,
                    value: web3.utils.toWei("1", "ether")
                }
            );

            const balance = await miner.balanceOf(ALICE);

            expect(balance).to.be.bignumber.equal(amount);
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
                sent: amount.toString(),
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
    });
});
