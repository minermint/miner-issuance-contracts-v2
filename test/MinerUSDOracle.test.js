const { BN, constants, expectEvent, expectRevert } = require("@openzeppelin/test-helpers");
const { expect } = require("chai");
const { ZERO_ADDRESS } = constants;

const MinerUSDOracle = artifacts.require("MinerUSDOracle");

contract("MinerUSDOracle", (accounts) => {
    const OWNER = accounts[0];

    const ALICE = accounts[3];
    const BOB = accounts[4];

    const EXCHANGE_RATE = new BN("150000000"); // $1.50 to 8 dp.

    const ADMIN = web3.utils.soliditySha3("ADMIN");

    let aggregator, oracle;

    beforeEach(async () => {
        oracle = await MinerUSDOracle.new();
    });

    it("should set up role access", async () => {
        const adminRole = await oracle.getRoleAdmin(ADMIN);
        expect(adminRole).to.be.equal(ADMIN);
    });

    it("should add a new user to the admin role as owner", async () => {
        await oracle.grantRole(ADMIN, ALICE);
        const hasRole = await oracle.hasRole(ADMIN, ALICE);

        expect(hasRole).to.be.true;
    });

    it("should add a new user to the admin role as admin", async () => {
        await oracle.grantRole(ADMIN, ALICE);
        await oracle.grantRole(ADMIN, BOB, { from: ALICE })
        const hasRole = await oracle.hasRole(ADMIN, BOB);

        expect(hasRole).to.be.true;
    });

    it("should NOT add a new admin without admin access", async () => {
        await expectRevert(
            oracle.grantRole(ADMIN, BOB, { from: ALICE }),
            "AccessControl: sender must be an admin to grant."
        );
    });

    it("should update the Miner USD price pair with owner", async () => {
        await oracle.grantRole(ADMIN, ALICE);
        await oracle.setExchangeRate(EXCHANGE_RATE);

        const block = await web3.eth.getBlock("latest");

        const xRate = await oracle.getLatestExchangeRate();

        const actual = [
            xRate[0].toString(),
            xRate[1].toNumber()
        ]

        const expected = [
            EXCHANGE_RATE.toString(),
            block.number
        ]

        expect(actual).to.have.same.members(expected);
    });

    it("should update the Miner USD price pair with admin user", async () => {
        await oracle.grantRole(ADMIN, ALICE);
        await oracle.setExchangeRate(EXCHANGE_RATE, { from: ALICE });

        const block = await web3.eth.getBlock("latest");

        const xRate = await oracle.getLatestExchangeRate();

        const actual = [
            xRate[0].toString(),
            xRate[1].toNumber()
        ]

        const expected = [
            EXCHANGE_RATE.toString(),
            block.number
        ]

        expect(actual).to.have.same.members(expected);
    });

    it("should NOT add exchange rate with invalid user", async () => {
        await expectRevert(
            oracle.setExchangeRate(EXCHANGE_RATE, { from: BOB }),
            "MinerOracle/no-admin-privileges"
        );
    });
});
