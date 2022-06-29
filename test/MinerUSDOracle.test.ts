import { ethers, waffle, deployments, getNamedAccounts } from "hardhat";
import { Contract } from "ethers";
import { expect } from "chai";

describe("MinerUSDOracle", () => {
    let deployer: any;
    let owner: any;
    let issuer: any;
    let alice: any;
    let bob: any;

    // $1.50 to 8 dp.
    const EXCHANGE_RATE = ethers.utils.parseUnits("1.5", 8);

    let oracle: Contract;

    before(async () => {
        ({ deployer, owner, issuer, alice, bob } = await getNamedAccounts());
    });

    beforeEach(async () => {
        await deployments.fixture(["all"]);
        oracle = await ethers.getContract("MinerUSDOracle");
    });

    it("should set the exchange rate", async () => {
        await oracle.setExchangeRate(EXCHANGE_RATE);

        const block = await waffle.provider.getBlock("latest");

        const xRate = await oracle.getLatestExchangeRate();

        const actual = [xRate[0].toString(), xRate[1].toNumber()];

        const expected = [EXCHANGE_RATE.toString(), block.number];

        expect(actual).to.have.same.members(expected);
    });

    it("should get an exchange rate at a particular index", async () => {
        await oracle.setExchangeRate(EXCHANGE_RATE);

        const block = await waffle.provider.getBlock("latest");

        const xRate = await oracle.getExchangeRate(0);

        const actual = [xRate[0].toString(), xRate[1].toNumber()];

        const expected = [EXCHANGE_RATE.toString(), block.number];

        expect(actual).to.have.same.members(expected);
    });

    it("should set up role access", async () => {
        const adminRole = await oracle.getRoleAdmin(await oracle.ADMIN());
        expect(adminRole).to.be.equal(await oracle.ADMIN());
    });

    it("should add a new user to the admin role as owner", async () => {
        await oracle.grantRole(await oracle.ADMIN(), alice);
        const hasRole = await oracle.hasRole(await oracle.ADMIN(), alice);

        expect(hasRole).to.be.true;
    });

    it("should add a new user to the admin role as admin", async () => {
        await oracle.grantRole(await oracle.ADMIN(), alice);
        await oracle
            .connect(await ethers.getSigner(alice))
            .grantRole(await oracle.ADMIN(), bob);
        const hasRole = await oracle.hasRole(await oracle.ADMIN(), bob);

        expect(hasRole).to.be.true;
    });

    it("should get a count of all the admin members", async () => {
        const adminRole = await oracle.getRoleAdmin(await oracle.ADMIN());
        await oracle.grantRole(await oracle.ADMIN(), alice);
        await oracle
            .connect(await ethers.getSigner(alice))
            .grantRole(await oracle.ADMIN(), bob);

        expect(await oracle.getRoleMemberCount(adminRole)).to.be.equal("3");
    });

    it("should NOT add a new admin without admin access", async () => {
        const adminRole = await oracle.getRoleAdmin(await oracle.ADMIN());
        const address = alice.toLowerCase();

        await expect(
            oracle
                .connect(await ethers.getSigner(alice))
                .grantRole(await oracle.ADMIN(), bob)
        ).to.be.revertedWith(
            `AccessControl: account ${address} is missing role ${adminRole}`
        );
    });

    it("should update the Miner USD price pair with owner", async () => {
        await oracle.grantRole(await oracle.ADMIN(), alice);
        await oracle.setExchangeRate(EXCHANGE_RATE);

        const block = await waffle.provider.getBlock("latest");

        const xRate = await oracle.getLatestExchangeRate();

        const actual = [xRate[0].toString(), xRate[1].toNumber()];

        const expected = [EXCHANGE_RATE.toString(), block.number];

        expect(actual).to.have.same.members(expected);
    });

    it("should update the Miner USD price pair with admin user", async () => {
        await oracle.grantRole(await oracle.ADMIN(), alice);
        await oracle
            .connect(await ethers.getSigner(alice))
            .setExchangeRate(EXCHANGE_RATE);

        const block = await waffle.provider.getBlock("latest");

        const xRate = await oracle.getLatestExchangeRate();

        const actual = [xRate[0].toString(), xRate[1].toNumber()];

        const expected = [EXCHANGE_RATE.toString(), block.number];

        expect(actual).to.have.same.members(expected);
    });

    it("should NOT add exchange rate with invalid user", async () => {
        await expect(
            oracle
                .connect(await ethers.getSigner(bob))
                .setExchangeRate(EXCHANGE_RATE)
        ).to.be.revertedWith("MinerOracle/no-admin-privileges");
    });

    it("should transfer ownership and set the new owner as an admin", async () => {
        await oracle.transferOwnership(alice);
        const newOwner = await oracle.owner();
        const isAdmin = await oracle.hasRole(await oracle.ADMIN(), alice);

        expect(newOwner).to.be.equal(alice);
        expect(isAdmin).to.be.true;
    });

    it("should emit OwnershipTransferred event", async () => {
        await expect(oracle.transferOwnership(alice))
            .to.emit(oracle, "OwnershipTransferred")
            .withArgs(deployer, alice);
    });
});
