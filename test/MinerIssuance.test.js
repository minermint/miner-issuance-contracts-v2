const Miner = artifacts.require("Miner");
const MinerIssuance = artifacts.require("MinerIssuance");

const BN = require("bn.js");

contract("MinerIssuance", function(accounts) {
    const OWNER = accounts[0];
    const OWNER_2 = accounts[1];
    const OWNER_3 = accounts[2];

    const ALICE = accounts[3];
    const BOB = accounts[4];

    let miner, minerIssuance;

    beforeEach(async () => {
        miner = await Miner.new();
        minerIssuance = await MinerIssuance.new(miner.address);
        await miner.setMinter(OWNER);
    });

    it("should fund the token issuance", async () => {
        let amount = new BN(12345);
        await miner.mint(amount);
        await miner.transfer(minerIssuance.address, amount);

        let actual = new BN(await miner.balanceOf(minerIssuance.address));

        assert.equal(
            actual.toNumber(),
            amount.toNumber(),
            "MinerIssuance/Incorrect amount");
    });

    describe("purchasing miner", () => {
        beforeEach(async () => {
            let amount = 1000 * 10 ** 4;
            await miner.mint(amount);
            await miner.transfer(minerIssuance.address, amount);
        });

        it("should issue miner tokens", async () => {
            let amount = 1000 * 10 ** 4;
            let unitPrice = 50;

            minerIssuance.issue(ALICE, amount, unitPrice, "USD");
        });

        it("should get trade count", async () => {
            await minerIssuance.issue(BOB, 100, 1500, "USD");
            await minerIssuance.issue(BOB, 100, 1500, "USD");
            await minerIssuance.issue(BOB, 100, 1500, "USD");

            const actual = await minerIssuance.getHistoryCount();
            assert.equal(Number(actual), 3, "Trade count should be 3");
        });

        it("should get alice trade count", async () => {
            await minerIssuance.issue(BOB, 100, 1500, "USD");
            await minerIssuance.issue(ALICE, 100, 1500, "USD");
            await minerIssuance.issue(BOB, 100, 1500, "USD");

            const actual = await minerIssuance.getAccountTradesCount(ALICE);
            assert.equal(Number(actual), 1, "Trade count should be 1");
        });

        it("should get alice trade indexes", async () => {
            await minerIssuance.issue(BOB, 100, 1500, "USD");
            await minerIssuance.issue(ALICE, 100, 1500, "USD");
            await minerIssuance.issue(ALICE, 100, 1500, "USD");
            await minerIssuance.issue(BOB, 100, 1500, "USD");
            var trades = await minerIssuance.getAccountTradesIndexes(ALICE);
            var tradesCount = await minerIssuance.getAccountTradesCount(ALICE);

            assert.equal(trades.length, new BN(tradesCount), "ALICE has two trades");
        });
    });
});
