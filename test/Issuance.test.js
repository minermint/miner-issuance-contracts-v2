const { BN, constants, expectEvent, expectRevert } = require("@openzeppelin/test-helpers");
const { expect } = require("chai");
const { ZERO_ADDRESS } = constants;

const Miner = artifacts.require("Miner");
const Issuance = artifacts.require("Issuance");

contract("Issuance", (accounts) => {
    const OWNER = accounts[0];
    const MINTER = accounts[1];
    const ISSUER = accounts[2];

    const ALICE = accounts[3];
    const BOB = accounts[4];

    const ZERO_BALANCE = new BN(0);

    let miner, issuance, swapEth;

    const decimals = new BN("18");
    const supply = new BN("1000").mul(new BN("10").pow(decimals));

    beforeEach(async () => {
        miner = await Miner.new();
        await miner.setMinter(MINTER);

        issuance = await Issuance.new(miner.address);

        await miner.mint(supply, { from: MINTER });
        await miner.transfer(issuance.address, supply, { from: MINTER });
    });

    it("should fund the token issuance", async () => {
        let actual = new BN(await miner.balanceOf(issuance.address));

        expect(actual).to.be.bignumber.equal(supply);
    });

    it("should be able to change contract ownership", async () => {
        await issuance.transferOwnership(ALICE);

        expect(await issuance.owner()).to.be.equal(ALICE);
    });

    describe("permitting issuance", () => {
        const ADMIN_ROLE = web3.utils.soliditySha3('ADMIN');
        const ISSUER_ROLE = web3.utils.soliditySha3('ISSUER');

        it("should add a new admin as owner", async () => {
            await issuance.grantRole(ADMIN_ROLE, ALICE);

            expect(await issuance.hasRole(ADMIN_ROLE, ALICE)).to.be.true;
        });

        it("should add a new admin as admin", async () => {
            await issuance.grantRole(ADMIN_ROLE, ALICE);
            await issuance.grantRole(ADMIN_ROLE, BOB, { from: ALICE });

            expect(await issuance.hasRole(ADMIN_ROLE, BOB)).to.be.true;
        });

        it("should add an issuer", async () => {
            await issuance.addIssuer(ISSUER);

            expect(await issuance.hasRole(ISSUER_ROLE, ISSUER)).to.be.true;
        });

        it("should emit a RoleGranted event", async () => {
            const { logs } = await issuance.addIssuer(ISSUER);

            expectEvent.inLogs(logs, 'RoleGranted', {
                role: ISSUER_ROLE,
                account: ISSUER,
                sender: OWNER
            });
        });

        it("should add an issuer as admin", async () => {
            await issuance.grantRole(ADMIN_ROLE, ALICE);
            await issuance.grantRole(ISSUER_ROLE, BOB, { from: ALICE });

            expect(await issuance.hasRole(ISSUER_ROLE, BOB)).to.be.true;
        });

        it("should remove an issuer", async () => {
            await issuance.addIssuer(ISSUER);
            await issuance.removeIssuer(ISSUER);

            expect(await issuance.hasRole(ISSUER_ROLE, ISSUER)).to.be.false;
        });

        it("should emit a RoleRevoked event", async () => {
            await issuance.addIssuer(ISSUER);
            const { logs } = await issuance.removeIssuer(ISSUER);

            expectEvent.inLogs(logs, 'RoleRevoked', {
                role: ISSUER_ROLE,
                account: ISSUER,
                sender: OWNER
            });
        });

        it("should NOT add issuer using invalid admin", async () => {
            await expectRevert(
                issuance.issue(ALICE, ZERO_BALANCE, { from: BOB }),
                "Issuance/no-issuer-privileges"
            );
        });
    });

    describe("issuing miner", () => {
        beforeEach(async () => {
            await issuance.addIssuer(ISSUER);
        });

        it("should issue miner tokens", async () => {
            const amount = web3.utils.toWei("1", "ether");

            await issuance.issue(ALICE, supply, { from: ISSUER });

            const balance = await miner.balanceOf(ALICE);

            expect(balance).to.be.bignumber.equal(supply);
        });

        it("should emit a Issued event", async () => {
            const { logs } = await issuance.issue(
                ALICE,
                supply,
                { from: ISSUER }
            );

            expectEvent.inLogs(logs, 'Issued', {
                recipient: ALICE,
                amount: supply.toString()
            });
        });

        it("should NOT issue from an invalid address", async () => {
            await expectRevert(
                issuance.issue(ALICE, supply, { from: BOB }),
                "Issuance/no-issuer-privileges"
            );
        });

        it("should NOT issue zero tokens", async () => {
            await expectRevert(
                issuance.issue(ALICE, ZERO_BALANCE, { from: ISSUER }),
                "Issuance/amount-invalid"
            );
        });

        it("should NOT exceed issuing more tokens than are available",
        async () => {
            await expectRevert(
                issuance.issue(ALICE, supply+1, { from: ISSUER }),
                "Issuance/balance-exceeded"
            );
        });
    });
});
