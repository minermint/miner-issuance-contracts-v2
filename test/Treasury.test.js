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

    beforeEach(async () => {
        miner = await Miner.new();
        treasury = await Treasury.new(miner.address);
        await miner.setMinter(treasury.address);
    });

    describe("Deploying", () => {
        it("should deploy the treasury and assign the Miner token",
        async () => {
            let minter = await miner.getMinter();
            assert.equal(minter, treasury.address, "Incorrect Minter");
        })


        it("should have one (1) authority who is also the contract owner",
        async () => {
            const grantedCount = new BN(await treasury.grantedCount());
            assert.equal(grantedCount.toString(), 1, "There should be one (1) authority when the contract is deployed");
        });

        it("should be able to add the minimum required number of signatories",
        async () => {
            await treasury.proposeGrant(OWNER_2);
            await treasury.proposeGrant(OWNER_3);

            count = await treasury.grantedCount();
            assert.equal(new BN(count), 3, "Authorised count should be 3");
        })

        it("should NOT be able to remove signatories", async () => {
            try {
                await treasury.proposeGrant(OWNER_2);
                await treasury.proposeRevoke(OWNER_2);
            } catch (error) {
                assert.equal(error.reason, "Treasury/not-enough-signatures", `Incorrect revert reason: ${error.reason}`);
            }
        })

        it("should NOT not be able to propose a mint", async () => {
            try {
                await treasury.proposeMint(1000);
            } catch (error) {
                assert.equal(error.reason, "Treasury/not-enough-signatures", `Incorrect revert reason: ${error.reason}`);
            }
        })

        it("should not be able to sign when there are no proposals",
        async () => {
            try {
                await treasury.sign({
                    from: OWNER
                });
            } catch (error) {
                assert(error);
                assert.equal(error.reason, "Treasury/no-proposals", `Incorrect revert reason: ${error.reason}`);
            }
        });
    })

    describe("Granting and Revoking Signatories", () => {
        beforeEach(async () => {
            await treasury.proposeGrant(OWNER_2);
            await treasury.proposeGrant(OWNER_3);
        });

        it("should be initialised with 3 authorities", async () => {
            let actual = await treasury.signatories(OWNER);
            assert.isTrue(actual, "OWNER should be signatory");

            actual = await treasury.signatories(OWNER_2);
            assert.isTrue(actual, "OWNER_2 should be signatory");

            actual = await treasury.signatories(OWNER_3);
            assert.isTrue(actual, "OWNER_3 should be signatory");
        });

        it("should reduce count when reovoking a signatory", async () => {
            await treasury.proposeGrant(ALICE);
            await treasury.sign({
                from: OWNER_2
            });

            var count = await treasury.grantedCount();
            assert.equal(new BN(count), 4, "Signatory count should be 4");

            await treasury.proposeRevoke(OWNER_3);
            await treasury.sign({
                from: OWNER_2
            });
            await treasury.sign({
                from: ALICE
            });

            count = await treasury.grantedCount();
            assert.equal(new BN(count), 3, "Authorised count should be 3");
        });

        it("should NOT be able to add an existing signatory", async () => {
            try {
                const result = await treasury.proposeGrant(OWNER_2);
            } catch (error) {
                assert.equal(error.reason, "Treasury/access-granted", `Incorrect revert reason: ${error.reason}`);
            }

            const count = await treasury.grantedCount();
            assert.equal(Number(count), 3, "Authorised count should be 3");
        });

        it("should NOT revoke authority when the minimum number of authorities are available",
        async () => {
            try {
                await treasury.proposeRevoke(OWNER_2);
            } catch (error) {
                assert.equal(error.reason, "Treasury/not-enough-signatures", `Incorrect revert reason: ${error.reason}`);
            }
        })
    });

    describe("Managing Authorisations", () => {
        describe("Making and Signing Proposals", () => {
            beforeEach(async () => {
                // set up 3 more signatories.
                await treasury.proposeGrant(OWNER_2);
                await treasury.proposeGrant(OWNER_3);
            });

            it("should NOT be able to add a proposal when one is pending", async () => {
                await treasury.proposeMint(1337);

                try {
                    await treasury.proposeMint(100);
                } catch (error) {
                    assert(error);
                    assert.equal(error.reason, "Treasury/proposal-pending", `Incorrect revert reason: ${error.reason}`);
                }
            });

            it("should NOT be able to sign multiple times", async () => {
                await treasury.proposeGrant(ALICE);
                await treasury.sign({
                    from: OWNER_2
                });
                await treasury.proposeGrant(BOB);
                await treasury.sign({
                    from: ALICE
                });

                try {
                    await treasury.sign({
                        from: ALICE
                    });
                } catch (error) {
                    assert.equal(
                        error.reason,
                        "Treasury/signatory-already-signed",
                        `Incorrect revert reason: ${error.reason}`);
                }
            });

            it("should be in signing period", async () => {
                await treasury.proposeMint(1337);

                const actual = await treasury.inSigningPeriod();
                assert.equal(actual, true, "Signing should be allowed");
            });

            it("should NOT be able to sign when there are no open proposals", async () => {
                try {
                    await treasury.sign({
                        from: OWNER
                    });
                } catch (error) {
                    assert(error);
                    assert.equal(error.reason, "Treasury/proposal-closed", `Incorrect revert reason: ${error.reason}`);
                }
            });
        })

        describe("Minting", async () => {
            beforeEach(async () => {
                // set up 2 more signatories.
                await treasury.proposeGrant(OWNER_2);
                await treasury.proposeGrant(OWNER_3);
            });

            it("should be able to mint Miner tokens", async () => {
                await treasury.proposeMint(1337);
                await treasury.sign({
                    from: OWNER_2
                });

                const balance = await miner.balanceOf(treasury.address);
                assert.equal(new BN(balance), 1337, "Balance not 1337");
            });

            it("should add proposal to mint 1337 tokens", async () => {
                await treasury.proposeMint(1337);
                await treasury.sign({
                    from: OWNER_2
                });

                const balance = await miner.balanceOf(OWNER);
                assert.equal(Number(balance), 0, "Balance should still be 0");

                const latestProposal = new BN(await treasury.getProposalsCount()) - 1;
                const proposal = await treasury.proposals(latestProposal);
                const mintProposal = await treasury.mintProposals(latestProposal);

                assert.equal(new BN(mintProposal), 1337, "Proposal amount should be 1337");
                assert.equal(proposal.who, OWNER, "Proposal owner should be Owner");
                assert.isFalse(proposal.open);
            });

            it("should withdraw miner tokens to the owner's wallet", async () => {
                await treasury.proposeMint(1337);
                await treasury.sign({
                    from: OWNER_2
                });

                await treasury.withdraw(1337);

                const treasuryBalance = await miner.balanceOf(treasury.address);
                const ownerBalance = await miner.balanceOf(OWNER);

                assert.equal(new BN(treasuryBalance).toNumber(), 0, "Treasury balance should be 0");
                assert.equal(new BN(ownerBalance).toNumber(), 1337, "Owner balance should be 1337");
            });
        });
    });
})
