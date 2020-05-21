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

    let miner;

    describe('Deploying', function () {
    	beforeEach(async function() {
    		miner = await Token.new();
    	})

        it("should have a name of Miner", async () =>  {
            const name = await miner.name();
            assert.equal(name, "Miner", "Name - Miner");
        });

        it("should have a symbol MINER", async () => {
            const symbol = await miner.symbol();
            assert.equal(symbol, "MINER", "Symbol - MINER");
        });

        it("should have a total supply of 0", async () => {
          const actual = await miner.totalSupply();
          assert.equal(Number(actual), 0, "Total supply should be 0");
        });

        it("should have a decimals of 4", async () => {
          const actual = await miner.decimals();
          assert.equal(Number(actual), 4, "Decimals should be 4");
        });
    })

    describe('Minting', function () {
        beforeEach(async function() {
            miner = await Token.new();
        })

        it("should set a minter", async () => {
            await miner.setMinter(OWNER_2);
            const minter = await miner.getMinter();

            assert.equal(minter, OWNER_2, "Not minter");
        })
    })
})
