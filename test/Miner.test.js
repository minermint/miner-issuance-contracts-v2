const Token = artifacts.require("Miner");
const BN = require("bn.js");

contract("Miner", function(accounts) {
    const decimals = new BN('4');
    const initialSupply = new BN('0').mul(new BN('10').pow(decimals));

    const OWNER = accounts[0];
    const OWNER_2 = accounts[1];
    const OWNER_3 = accounts[2];
    const ALICE = accounts[3];
    const BOB = accounts[4];

    let tokenInstance;

    describe('deployment', function () {
    	beforeEach(async function() {
    		tokenInstance = await Token.new();
    	})

        it("should have a name of Miner", async () =>  {
            const name = await tokenInstance.name();
            assert.equal(name, "Miner", "Name - Miner");
        });

        it("should have a symbol MINER", async () => {
            const symbol = await tokenInstance.symbol();
            assert.equal(symbol, "MINER", "Symbol - MINER");
        });
    })

    describe('minting', function () {
        beforeEach(async function() {
            tokenInstance = await Token.new();
        })

        it("should set a minter", async () => {
            await tokenInstance.setMinter(OWNER_2);
            const minter = await tokenInstance.getMinter();

            assert.equal(minter, OWNER_2, "Not minter");
        })
    })
})
