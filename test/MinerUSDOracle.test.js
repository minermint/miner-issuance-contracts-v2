const { BN, expectEvent, expectRevert } = require("@openzeppelin/test-helpers");
const { expect } = require("chai");

const MinerUSDOracle = artifacts.require("MinerUSDOracle");

contract("MinerUSDOracle", (accounts) => {
    const OWNER = accounts[0];

    const ALICE = accounts[3];
    const BOB = accounts[4];

    // $1.50 to 8 dp.
    const EXCHANGE_RATE = new BN("150000000");

    const ADMIN = web3.utils.soliditySha3("ADMIN");

    let oracle;

    beforeEach(async () => {
        oracle = await MinerUSDOracle.new();
    });

    it("should set the exchange rate", async () => {
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

    it("should get an exchange rate at a particular index", async () => {
        await oracle.setExchangeRate(EXCHANGE_RATE);

        const block = await web3.eth.getBlock("latest");

        const xRate = await oracle.getExchangeRate(0);

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

    it("should get a count of all the admin members", async () => {
        const adminRole = await oracle.getRoleAdmin(ADMIN);
        await oracle.grantRole(ADMIN, ALICE);
        await oracle.grantRole(ADMIN, BOB, { from: ALICE })

        expect(await oracle.getRoleMemberCount(adminRole))
            .to
            .be
            .bignumber
            .equal("3");
    });

    it("should NOT add a new admin without admin access", async () => {
        const adminRole = await oracle.getRoleAdmin(ADMIN);
        const address = ALICE.toLowerCase();

        await expectRevert(
            oracle.grantRole(ADMIN, BOB, { from: ALICE }),
            `AccessControl: account ${address} is missing role ${adminRole} -- Reason given: AccessControl: account $(address) is missing role ${admin}.`
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

    it("should transfer ownership and set the new owner as an admin",
    async () => {
        await oracle.transferOwnership(ALICE);
        const newOwner = await oracle.owner();
        const isAdmin = await oracle.hasRole(ADMIN, ALICE);

        expect(newOwner).to.be.equal(ALICE);
        expect(isAdmin).to.be.true;
    });

    it("should emit OwnershipTransferred event", async () => {
        const { logs } = await oracle.transferOwnership(ALICE);

        expectEvent.inLogs(logs, 'OwnershipTransferred', {
            newOwner: ALICE,
            previousOwner: OWNER
        });
    });
});
