const Miner = artifacts.require("Miner");
const Treasury = artifacts.require("Treasury");

const BN = require("bn.js");

contract("Treasury", function(accounts) {
    const OWNER = accounts[0];
    const OWNER_2 = accounts[1];
    const OWNER_3 = accounts[2];

    const ALICE = accounts[3];
    const BOB = accounts[4];

    let miner, treasury;

    describe("Deploy", function() {
        it("should deploy the treasury and assign the Miner token",
        async function () {
            miner = await Miner.new();
            treasury = await Treasury.new(miner.address);
            await miner.setMinter(treasury.address);
            let minter = await miner.getMinter();
            assert.equal(minter, treasury.address, "Incorrect Minter");
        })
    })

    describe("Minting", function() {
        beforeEach(async () => {
            miner = await Miner.new();
            treasury = await Treasury.new(miner.address);
            await miner.setMinter(treasury.address);

            // set up 2 more signatories.
            await treasury.proposeGrant(OWNER_2);
            await treasury.proposeGrant(OWNER_3);
        });

        it("should be able to mint Miner tokens", async function () {
            await treasury.proposeMint(1337);
            await treasury.sign({ from: OWNER_2 });

            const balance = await miner.balanceOf(treasury.address);
            assert.equal(new BN(balance), 1337, "Balance not 1337");
        });
    })
})
