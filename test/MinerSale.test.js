const Miner = artifacts.require("Miner");
const MinerSale = artifacts.require("MinerSale");

const BN = require("bn.js");

contract("MinerSale", function(accounts) {
    const OWNER = accounts[0];
    const OWNER_2 = accounts[1];
    const OWNER_3 = accounts[2];

    const ALICE = accounts[3];
    const BOB = accounts[4];

    let miner, minerSale;

    beforeEach(async () => {
        miner = await Miner.new();
        minerSale = await MinerSale.new(miner.address);
        await miner.setMinter(OWNER);
    });

    it("should fund the token sale", async () => {
        let amount = new BN(12345);
        await miner.mint(amount);
        await miner.transfer(minerSale.address, amount);

        let actual = new BN(await miner.balanceOf(minerSale.address));

        assert.equal(
            actual.toNumber(),
            amount.toNumber(),
            "MinerSale/Incorrect amount");
    });

    describe("purchasing miner", () => {
        beforeEach(async () => {
            let amount = new BN(1000000);
            await miner.mint(amount);
            await miner.transfer(minerSale.address, amount);
        });

        it("should purchase miner tokens", async () => {
            let amount = 1000 * 10 ^ 4;
            let unitPrice = 50;
            let ethPrice = "0.025 Ether";

            minerSale.purchase(ALICE, amount, unitPrice, ethPrice);
        });
    });
});
