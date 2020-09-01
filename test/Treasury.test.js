const Miner = artifacts.require("Miner");
const Treasury = artifacts.require("Treasury");
const Issuance = artifacts.require("Issuance");

const {
    BN,
    expectEvent,
    expectRevert,
    time
} = require("@openzeppelin/test-helpers");

const { expect } = require("chai");

contract("Treasury", (accounts) => {
    const OWNER = accounts[0];
    const OWNER_2 = accounts[1];
    const OWNER_3 = accounts[2];

    const ALICE = accounts[3];
    const BOB = accounts[4];

    const FAST_FORWARD = 60*60*48;
    const ZERO_BALANCE = new BN(0);

    const Access = {"None": "0", "Grant": "1", "Revoke": "2"};

    const decimals = new BN("18");
    const supply = new BN("1000000").mul(new BN("10").pow(decimals));

    let miner, treasury;

    beforeEach(async () => {
        miner = await Miner.new();
        treasury = await Treasury.new(miner.address);
        await miner.setMinter(treasury.address);
    });

    describe("deployment", () => {
        it("should deploy the treasury and assign the Miner token",
        async () => {
            let minter = await miner.getMinter();
            expect(minter).to.be.equal(treasury.address);
        })

        it("should have one (1) signatory who is also the contract owner",
        async () => {
            const totalSignatories = new BN(await treasury.getSignatoryCount());
            const expected = new BN(1);

            expect(totalSignatories).to.be.bignumber.equal(expected);
        });

        it("should have one (1) granted signatory who is also the contract owner",
        async () => {
            const grantedCount = new BN(await treasury.grantedCount());
            const expected = new BN(1);

            expect(grantedCount).to.be.bignumber.equal(expected);
        });

        it("should be able to add the minimum required number of signatories",
        async () => {
            await treasury.proposeGrant(OWNER_2);
            await treasury.proposeGrant(OWNER_3);
            await treasury.sign({ from: OWNER_2 });

            const count = new BN(await treasury.grantedCount());
            const expected = new BN(3);

            expect(count).to.be.bignumber.equal(expected);
        });

        it("should NOT be able to remove signatories", async () => {
            await treasury.proposeGrant(OWNER_2);
            await expectRevert(
                treasury.proposeRevoke(OWNER_2),
                "Treasury/minimum-signatories");
        })

        it("should NOT not be able to propose a mint", async () => {
            await expectRevert(
                treasury.proposeMint(supply),
                "Treasury/minimum-signatories");
        })

        it("should NOT be able to sign when there are no proposals",
        async () => {
            await expectRevert(
                treasury.sign(),
                "Treasury/no-proposals");
        });

        it("should NOT be in signing period", async () => {
            const actual = await treasury.inSigningPeriod();
            expect(actual).to.be.false;
        });

        it("should NOT be able to veto without minimum signatories",
        async () => {
            await expectRevert(
                treasury.vetoProposal(),
                "Treasury/minimum-signatories");
        });

        describe("ownership", () => {
            it("should be able to change contract ownership", async () => {
                await treasury.transferOwnership(OWNER_2);

                expect(await treasury.owner()).to.be.equal(OWNER_2);
            });

            it("should not allow new owner to be signatory", async () => {
                await treasury.transferOwnership(OWNER_2);

                await expectRevert(
                    treasury.proposeGrant(OWNER_3, { from: OWNER_2 }),
                    "Treasury/invalid-signatory"
                );
            });
        });
    });

    describe("proposals", () => {
        beforeEach(async () => {
            await treasury.proposeGrant(OWNER_2);
            await treasury.proposeGrant(OWNER_3);
            await treasury.sign({ from: OWNER_2 });
        });

        describe("granting and revoking signatories", () => {
            it("should be initialised with 3 signatories", async () => {
                await treasury.signatories(OWNER);
                await treasury.signatories(OWNER_2);
                await treasury.signatories(OWNER_3);

                const count = await treasury.getSignatoryCount();
                const actual = new BN(3);
                expect(count).to.be.bignumber.equal(actual);
            });

            it("should have a signatory with grant access", async () => {
                let actual = await treasury.signatories(OWNER);
                expect(actual).to.be.bignumber.equal(Access.Grant);
            });

            it("should reduce count when revoking a signatory", async () => {
                await treasury.proposeGrant(ALICE);
                await treasury.sign({
                    from: OWNER_2
                });

                var count = new BN(await treasury.grantedCount());
                const initialActual = new BN(4);
                expect(count).to.be.bignumber.equal(initialActual);

                await treasury.proposeRevoke(OWNER_3);
                await treasury.sign({ from: OWNER_2 });
                await treasury.sign({ from: ALICE });

                count = new BN(await treasury.grantedCount());
                const newActual = new BN(3);

                expect(count).to.be.bignumber.equal(newActual);
            });

            it("should NOT be able to add an existing signatory", async () => {
                await expectRevert(
                    treasury.proposeGrant(OWNER_2),
                    "Treasury/access-granted");

                const count = new BN(await treasury.grantedCount());
                const expected = new BN(3);

                expect(count).to.be.bignumber.equal(expected);
            });

            it("should revoke signatory when the minimum number of revoke authorities is met",
            async () => {
                await treasury.proposeGrant(ALICE);
                await treasury.sign({ from: OWNER_2 });

                await treasury.proposeRevoke(OWNER_3);
                await treasury.sign({ from: ALICE });
                await treasury.sign({ from: OWNER_2 });

                const signatory = await treasury.signatories(OWNER_3);
                expect(signatory).to.be.bignumber.equal(Access.Revoke);
            })

            it("should be able to re-enable a revoked signatory", async () => {
                const expected = new BN(4);

                await treasury.proposeGrant(ALICE);
                await treasury.sign({ from: OWNER_2 });

                await treasury.proposeRevoke(OWNER_3);
                await treasury.sign({ from: ALICE });
                await treasury.sign({ from: OWNER_2 });

                await treasury.proposeGrant(OWNER_3);
                await treasury.sign({ from: OWNER_2 });

                let count = await treasury.grantedCount();
                expect(count).to.be.bignumber.equal(expected);

                count = await treasury.getSignatoryCount();
                expect(count).to.be.bignumber.equal(expected);
            });

            it("should NOT revoke when the minimum number of signatories has not be reached",
            async () => {
                await expectRevert(
                    treasury.proposeRevoke(OWNER_2),
                    "Treasury/minimum-signatories");
            })

            it("should be able to list a proposal's signatures",
            async () => {
                await treasury.proposeGrant(ALICE);
                await treasury.sign({ from: OWNER_2 });

                const proposalCount = await treasury.getProposalsCount();

                const signatures = await treasury.getSignatures(
                    proposalCount.sub(new BN(1)));

                expect(signatures).to.have.lengthOf(2);
                expect(signatures[1]).to.be.equal(OWNER_2);
            });

            it("should NOT be able to add a proposal when one is pending",
            async () => {
                await treasury.proposeMint(supply);

                await expectRevert(
                    treasury.proposeMint(100),
                    "Treasury/proposal-pending");
            });

            it("should NOT be able to sign multiple times", async () => {
                await treasury.proposeGrant(ALICE);
                await treasury.sign({ from: OWNER_2 });
                await treasury.proposeGrant(BOB);

                await treasury.sign({ from: ALICE });

                await expectRevert(
                    treasury.sign({ from: ALICE }),
                    "Treasury/signatory-already-signed");
            });

            it("should be in signing period", async () => {
                await treasury.proposeMint(supply);

                const actual = await treasury.inSigningPeriod();
                expect(actual).to.be.true;
            });

            it("should be outside signing period when proposal expires",
            async () => {
                await treasury.proposeMint(supply);

                time.increase(FAST_FORWARD);

                const isActive = await treasury.inSigningPeriod();

                expect(isActive).to.be.false;
            });

            it("should NOT be able to sign when there are no open proposals",
            async () => {
                await expectRevert(
                    treasury.sign(),
                    "Treasury/proposal-expired");
            });

            it("should NOT be able to sign when revoked", async() => {
                await treasury.proposeGrant(ALICE);
                await treasury.sign({ from: OWNER_2} );

                await treasury.proposeRevoke(ALICE);
                await treasury.sign({ from: OWNER_2 });
                await treasury.sign({ from: OWNER_3} );

                await treasury.proposeMint(supply);

                await expectRevert(
                    treasury.sign({ from: ALICE }),
                    "Treasury/invalid-signatory"
                );
            });

            it("should timeout a proposal to mint after 48 hours",
            async() => {
                await treasury.proposeMint(supply);

                time.increase(FAST_FORWARD);

                await expectRevert(
                    treasury.sign({ from: OWNER_2 }),
                    "Treasury/proposal-expired");
            });

            it("should emit a Grant event", async () => {
                await treasury.proposeGrant(ALICE);
                const { logs } = await treasury.sign({ from: OWNER_2 });

                expectEvent.inLogs(logs, 'AccessGranted', {
                    signatory: ALICE
                });
            });

            it("should emit a Revoke event", async () => {
                await treasury.proposeGrant(ALICE);
                await treasury.sign({ from: OWNER_2 });

                await treasury.proposeRevoke(OWNER_2);
                await treasury.sign({ from: OWNER_3 });

                const { logs } = await treasury.sign({ from: ALICE });

                expectEvent.inLogs(logs, 'AccessRevoked', {
                    signatory: OWNER_2
                });
            });

            it("should emit a Signed event", async () => {
                const { logs } = await treasury.proposeGrant(ALICE);

                expectEvent.inLogs(logs, 'Signed', { index: "2" });
            });
        })

        describe("minting", async () => {
            let issuance;

            beforeEach(async () => {
                issuance = await Issuance.new(miner.address);
            });

            it("should be able to mint Miner tokens", async () => {
                await treasury.proposeMint(supply);
                await treasury.sign({ from: OWNER_2 });

                const balance = await miner.balanceOf(treasury.address);
                expect(new BN(balance)).to.be.bignumber.equal(supply);
            });

            it("should propose the minting of tokens", async () => {
                await treasury.proposeMint(supply);
                await treasury.sign({ from: OWNER_2 });

                const balance = await miner.balanceOf(OWNER);

                expect(balance).to.be.bignumber.equal(ZERO_BALANCE);

                const count = await treasury.getProposalsCount();
                const index = count.sub(new BN(1));

                const proposal = await treasury.proposals(index);
                const mintProposal = await treasury.mintProposals(index);

                expect(mintProposal).to.be.bignumber.equal(supply);
                expect(proposal.proposer).to.be.bignumber.equal(OWNER);
                expect(proposal.open).to.be.false;
            });

            it("should withdraw miner tokens to the owner's wallet", async () => {
                await treasury.proposeMint(supply);
                await treasury.sign({ from: OWNER_2 });

                await treasury.proposeWithdrawal(ALICE, supply);
                await treasury.sign({ from: OWNER_2 });

                const treasuryBalance = await miner.balanceOf(treasury.address);
                const aliceBalance = await miner.balanceOf(ALICE);

                expect(treasuryBalance).to.be.bignumber.equal(ZERO_BALANCE);
                expect(aliceBalance).to.be.bignumber.equal(supply);
            });

            it("should emit Minted event", async () => {
                await treasury.proposeMint(supply);

                const { logs } = await treasury.sign({ from: OWNER_2 });

                expectEvent.inLogs(logs, 'Minted', { amount: supply });
            });

            it("should emit Withdrawn event", async () => {
                await treasury.proposeMint(supply);
                await treasury.sign({ from: OWNER_2 });

                await treasury.proposeWithdrawal(OWNER_2, supply);

                const { logs } = await treasury.sign({ from: OWNER_2 });

                expectEvent.inLogs(logs, 'Withdrawn', {
                    amount: supply,
                    recipient: OWNER_2
                });
            });

            it("should not withdraw when amount is zero (0)", async () => {
                await expectRevert(
                    treasury.proposeWithdrawal(OWNER_2, ZERO_BALANCE),
                    "Treasury/zero-amount");
            });

            it("should fund issuance for distributing miner", async () => {
                await treasury.proposeMint(supply);
                await treasury.sign({ from: OWNER_2 });

                await treasury.proposeWithdrawal(issuance.address, 100);
                await treasury.sign({ from: OWNER_2 });

                const treasuryBalance = await miner.balanceOf(treasury.address);
                const issuanceBalance = await miner.balanceOf(issuance.address);
                const expectedIssuanceSupply = new BN(100);
                const expectedTreasurySupply = supply.sub(expectedIssuanceSupply);

                expect(
                    treasuryBalance
                ).to.be.bignumber.equal(
                    expectedTreasurySupply
                );

                expect(
                    issuanceBalance
                ).to.be.bignumber.equal(
                    expectedIssuanceSupply
                );
            });
        });
    });

    describe("vetoing", () => {
        beforeEach(async () => {
            await treasury.proposeGrant(OWNER_2);
            await treasury.proposeGrant(OWNER_3);
            await treasury.sign({ from: OWNER_2 });
        });

        it("should veto an existing proposal", async () => {
            await treasury.proposeGrant(ALICE, { from: OWNER_3 });

            await treasury.vetoProposal({ from: OWNER_2 });

            const vetoes = await treasury.getVetoCount();
            expect(vetoes.toNumber()).to.be.equal(1);
        });

        it("should endorse the vetoing of a proposal", async () => {
            await treasury.proposeGrant(ALICE, { from: OWNER_3 });

            await treasury.vetoProposal({ from: OWNER_2 });
            await treasury.endorseVeto({ from: OWNER });

            const count = await treasury.getProposalsCount();
            const index = count.sub(new BN(1));
            const latestProposal = await treasury.proposals(index);

            expect(latestProposal.open).to.be.false;

            const signatory = await treasury.signatories(OWNER_3);

            expect(signatory).to.be.bignumber.equal(Access.Revoke);
        });

        it("should NOT be able to add a veto when one is pending",
        async () => {
            await treasury.proposeGrant(ALICE, { from: OWNER_3 });

            await treasury.vetoProposal({ from: OWNER_2 });

            await expectRevert(
                treasury.vetoProposal(),
                "Treasury/veto-pending");
        });

        it("should NOT be able to veto if not a signatory",
        async () => {
            await expectRevert(
                treasury.vetoProposal({ from: ALICE }),
                "Treasury/invalid-signatory");
        });

        it("should NOT be able to veto an expired proposal",
        async () => {
            await expectRevert(
                treasury.vetoProposal(),
                "Treasury/proposal-expired");
        });

        it("should NOT be able to endorse when no vetos", async () => {
            await treasury.proposeGrant(ALICE, { from: OWNER_3 });

            await expectRevert(
                treasury.endorseVeto(),
                "Treasury/no-vetoes"
            );
        });

        describe("endorsing", () => {
            beforeEach(async () => {
                await treasury.proposeGrant(ALICE, { from: OWNER_3 });

                await treasury.vetoProposal({ from: OWNER_2 });
            });

            it("should be able to endorse a veto", async () => {
                await treasury.endorseVeto();

                const latestVeto = await treasury.vetoes(0);

                expect(latestVeto).to.include({
                    enforced: true,
                    proposer: OWNER_2
                });
            });

            it("should emit a Vetoed event", async () => {
                const { logs } = await treasury.endorseVeto();

                expectEvent.inLogs(logs, 'Vetoed', {
                    proposal: "2",
                    veto: "0"
                });
            });

            it("should NOT be able to endorse a veto when proposal expired",
            async () => {
                await treasury.sign({ from: OWNER_2 });

                await expectRevert(
                    treasury.endorseVeto(),
                    "Treasury/proposal-expired"
                );
            });

            it("should NOT be able to endorse a veto when not a signatory",
            async () => {
                await expectRevert(
                    treasury.endorseVeto({ from: ALICE }),
                    "Treasury/invalid-signatory"
                );
            });

            it("should be able to get a list of endorsements for a veto",
            async () => {
                await treasury.endorseVeto();

                const vetoers = await treasury.getVetoEndorsements(0);
                expect(vetoers).to.be.lengthOf(2);
            });

            it("should NOT be able to endorse a veto when proposal times out",
            async () => {
                time.increase(FAST_FORWARD);

                await expectRevert(
                    treasury.endorseVeto({ from: OWNER_3 }),
                    "Treasury/proposal-expired"
                );
            });

            it("should NOT be able to endorse veto multiple times",
            async () => {
                await expectRevert(
                    treasury.endorseVeto({ from: OWNER_2 }),
                    "Treasury/signatory-already-vetoed");
            });
        });
    });
});
