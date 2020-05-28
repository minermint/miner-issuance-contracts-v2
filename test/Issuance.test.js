const Miner = artifacts.require("Miner");
const Issuance = artifacts.require("Issuance");

const BN = require("bn.js");

contract("Issuance", function(accounts) {
    const OWNER = accounts[0];
    const OWNER_2 = accounts[1];
    const OWNER_3 = accounts[2];

    const ALICE = accounts[3];
    const BOB = accounts[4];

    let miner, issuance;

    beforeEach(async () => {
        miner = await Miner.new();
        issuance = await Issuance.new(miner.address);
        await miner.setMinter(OWNER);
    });

    it("should fund the token issuance", async () => {
        let amount = new BN(12345);
        await miner.mint(amount);
        await miner.transfer(issuance.address, amount);

        let actual = new BN(await miner.balanceOf(issuance.address));

        assert.equal(
            actual.toNumber(),
            amount.toNumber(),
            "Issuance/Incorrect amount");
    });

    describe("purchasing miner", () => {
        beforeEach(async () => {
            let amount = 1000 * 10 ** 4;
            await miner.mint(amount);
            await miner.transfer(issuance.address, amount);
        });

        it("should issue miner tokens", async () => {
            let amount = 1000 * 10 ** 4;
            let unitPrice = 50;

            issuance.issue(ALICE, amount, unitPrice, "USD");
        });

        it("should get trade count", async () => {
            await issuance.issue(BOB, 100, 1500, "USD");
            await issuance.issue(BOB, 100, 1500, "USD");
            await issuance.issue(BOB, 100, 1500, "USD");

            const actual = await issuance.getHistoryCount();
            assert.equal(Number(actual), 3, "Trade count should be 3");
        });

        it("should get alice trade count", async () => {
            await issuance.issue(BOB, 100, 1500, "USD");
            await issuance.issue(ALICE, 100, 1500, "USD");
            await issuance.issue(BOB, 100, 1500, "USD");

            const actual = await issuance.getAccountTradesCount(ALICE);
            assert.equal(Number(actual), 1, "Trade count should be 1");
        });

        it("should get alice trade indexes", async () => {
            await issuance.issue(BOB, 100, 1500, "USD");
            await issuance.issue(ALICE, 100, 1500, "USD");
            await issuance.issue(ALICE, 100, 1500, "USD");
            await issuance.issue(BOB, 100, 1500, "USD");
            var trades = await issuance.getAccountTradesIndexes(ALICE);
            var tradesCount = await issuance.getAccountTradesCount(ALICE);

            assert.equal(trades.length, new BN(tradesCount), "ALICE has two trades");
        });
    });
});
