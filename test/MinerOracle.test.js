const { BN, constants, expectEvent, expectRevert } = require("@openzeppelin/test-helpers");
const { expect } = require("chai");
const { ZERO_ADDRESS } = constants;

const MinerOracle = artifacts.require("MinerOracle");
const PriceFeed = artifacts.require("PriceFeed");

contract("MinerOracle", (accounts) => {
    const OWNER = accounts[0];

    const ALICE = accounts[3];
    const BOB = accounts[4];

    const ROLE_ADMIN = web3.utils.soliditySha3("ADMIN");
    const ROLE_WRITE = web3.utils.soliditySha3("WRITE");

    const CURRENCY_CODE = "USD";
    const EXCHANGE_RATE = new BN("150000000"); // $1.50 to 8 dp.

    let aggregator, oracle;

    beforeEach(async () => {
        aggregator = await PriceFeed.new();
        oracle = await MinerOracle.new(aggregator.address);
    });

    it("Sets up role access", async () => {
        const adminRole = await oracle.getRoleAdmin(oracle.DEFAULT_ADMIN_ROLE);

        expect(adminRole).to.be.equal(ROLE_ADMIN);
    });

    it("Adds a new user to the WRITE role", async () => {
        await oracle.grantRole(ROLE_WRITE, ALICE);
        const hasRole = await oracle.hasRole(ROLE_WRITE, ALICE);
        console.log("has role", hasRole);
        expect(hasRole).to.be.true;
    });

    it("Updates the Miner USD price pair", async () => {
        await oracle.grantRole(ROLE_WRITE, ALICE);
        await oracle.setExchangeRate("USD", EXCHANGE_RATE);

        const block = await web3.eth.getBlock("latest");

        const xRate = await oracle.getLatestExchangeRate();

        const actual = [
            xRate[0],
            xRate[1].toString(),
            xRate[2].toNumber()
        ]

        const expected = [
            CURRENCY_CODE,
            EXCHANGE_RATE.toString(),
            block.number
        ]

        expect(actual).to.have.same.members(expected);
    });

    it("Cannot add exchange rate with invalid user", async () => {
        await expectRevert(
            oracle.setExchangeRate("USD", EXCHANGE_RATE, { from: BOB }),
            "MinerOracle/no-write-privileges"
        );
    });
});
