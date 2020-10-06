const { BN, constants, expectEvent, expectRevert } = require("@openzeppelin/test-helpers");
const { expect } = require("chai");
const { ZERO_ADDRESS } = constants;

const Miner = artifacts.require("Miner");
const Issuance = artifacts.require("Issuance");
const MinerOracle = artifacts.require("MinerOracle");
const PriceFeed = artifacts.require("PriceFeed");

contract("Issuance", (accounts) => {
    const OWNER = accounts[0];

    const ALICE = accounts[3];
    const BOB = accounts[4];

    const ZERO_BALANCE = new BN(0);

    let miner, issuance;

    const decimals = new BN("18");
    const supply = new BN("1000000").mul(new BN("10").pow(decimals));

    beforeEach(async () => {
        miner = await Miner.new();
        await miner.setMinter(OWNER);

        aggregator = await PriceFeed.new();
        oracle = await MinerOracle.new(aggregator.address);

        let minerUSD = new web3.utils.BN(150)
        let padding = new web3.utils.BN(10)
        padding = padding.pow(new web3.utils.BN(6));

        minerUSD = minerUSD.mul(padding);

        console.log('minerUSD', minerUSD.toString())

        oracle.setMinerUSD(minerUSD);

        issuance = await Issuance.new(miner.address);
        issuance.setMinerOracle(oracle.address);
    });

    it("should fund the token issuance", async () => {
        await miner.mint(supply);
        await miner.transfer(issuance.address, supply);

        let actual = new BN(await miner.balanceOf(issuance.address));

        expect(actual).to.be.bignumber.equal(supply);
    });

    it("should be able to change contract ownership", async () => {
        await issuance.transferOwnership(ALICE);

        expect(await issuance.owner()).to.be.equal(ALICE);
    });

    describe("purchasing miner", () => {
        const amount = new BN("100000").mul(new BN("10").pow(decimals));

        beforeEach(async () => {
            await miner.mint(supply);
            await miner.transfer(issuance.address, supply);
        });

        it.only("should get the latest price from the oracle", async() => {
            await issuance.issue(ALICE, { value: web3.utils.toWei("1", "ether") });

            console.log("alice's miner balance", (await miner.balanceOf(ALICE)).toString());
        });

        it("should issue miner tokens", async () => {
            await issuance.issue(ALICE, amount);

            const balance = await miner.balanceOf(ALICE);

            expect(balance).to.be.bignumber.equal(amount);
        });

        it("should emit a Issued event", async () => {
            const { logs } = await issuance.issue(ALICE, amount);

            expectEvent.inLogs(logs, 'Issued', {
                amount: amount.toString(),
                recipient: ALICE,
            });
        });

        it("should NOT issue zero tokens", async () => {
            await expectRevert(
                issuance.issue(ALICE, ZERO_BALANCE),
                "Issuance/amount-invalid");
        });

        it("should NOT issue tokens as an invalid user", async () => {
            await expectRevert(
                issuance.issue(ALICE, amount, { from: ALICE }),
                "Ownable: caller is not the owner");
        });

        it("should NOT exceed issuing more tokens than are available",
        async () => {
            let tooMuch = supply.add(new BN(1));

            await expectRevert(
                issuance.issue(ALICE, tooMuch),
                "Issuance/balance-exceeded");
        });

        it("should NOT issue tokens as zero address", async () => {
            await expectRevert(
                issuance.issue(ZERO_ADDRESS, ZERO_BALANCE),
                "Issuance/address-invalid");
        });
    });
});
