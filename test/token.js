const Token = artifacts.require("Token");
const BN = require("bn.js");

//const helper = require("./helpers/truffleTestHelper");

contract("Token", function(accounts) {
  const OWNER = accounts[0];
  const OWNER_2 = accounts[1];
  const OWNER_3 = accounts[2];

  const ALICE = accounts[3];
  const BOB = accounts[4];

  let tokenInstance;

  // test the contract in its initial, deployed state.
  describe("Deployment tests", async () => {
    beforeEach(async () => {
      tokenInstance = await Token.new();
    });

    it("should test ERC20 public properties", async () =>  {
      const name = await tokenInstance.name();
      assert.equal(name, "Miner", "Name should be Miner");

      const symbol = await tokenInstance.symbol();
      assert.equal(symbol, "MNR", "Symbol should be MNR");
    });

    it("should have a total supply of 0", async () => {
      const actual = await tokenInstance.totalSupply();
      assert.equal(Number(actual), 0, "Total supply should be 0");
    });

    it("should have onwer balance of 0", async () => {
      const actual = await tokenInstance.balanceOf(OWNER);
      assert.equal(actual.valueOf(), 0, "Balance should be 0");
    });

    it("should have a decimals of 4", async () => {
      const actual = await tokenInstance.decimals();
      assert.equal(Number(actual), 4, "Decimals should be 4");
    });

    it("should have one (1) authority who is also the contract owner",
    async () => {
      const authorityCount = new BN(await tokenInstance.authorisedCount());
      assert.equal(authorityCount.toString(), 1, "There should be one (1) authority when the contract is deployed");
    });

    it("should be able to add the minimum required number of signatories",
      async() => {
        await tokenInstance.proposeGrant(OWNER_2);
        await tokenInstance.proposeGrant(OWNER_3);

        count = await tokenInstance.authorisedCount();
        assert.equal(new BN(count), 3, "Authorised count should be 3");
    })

    it("should NOT be able to remove signatories", async() => {
      try {
        await tokenInstance.proposeGrant(OWNER_2);
        await tokenInstance.proposeRevoke(OWNER_2);
      } catch (error) {
        assert.equal(error.reason, "Minimum authorities not met", `Incorrect revert reason: ${error.reason}`);
      }
    })

    it("should NOT not be able to propose a mint", async() => {
      try {
        await tokenInstance.proposeMint(1000);
      } catch (error) {
        assert.equal(error.reason, "Minimum authorities not met", `Incorrect revert reason: ${error.reason}`);
      }
    })

    it("should not be able to sign when there are no proposals", async() => {
      try {
        await tokenInstance.sign({ from: OWNER });
      } catch (error) {
        assert(error);
        assert.equal(error.reason, "No proposals have been submitted", `Incorrect revert reason: ${error.reason}`);
      }
    });
  });

  describe("Managing Authorisations", () => {
    describe("Making and Signing Proposals", () => {
      beforeEach(async () => {
        tokenInstance = await Token.new();

        // set up 3 more signatories.
        await tokenInstance.proposeGrant(OWNER_2);
        await tokenInstance.proposeGrant(OWNER_3);
      });

      it("should NOT be able to add proposal because there are not enough signatories", async () => {
        await tokenInstance.proposeRevoke(OWNER_3);
        await tokenInstance.sign({ from: OWNER_2 });

        try {
          await tokenInstance.proposeMint(1337);
          await tokenInstance.sign({ from: OWNER_2 });
        } catch (error) {
          assert(error);
          assert.equal(error.reason, "Minimum authorities not met", `Incorrect revert reason: ${error.reason}`);
        }
      });

      it("should NOT be able to add a proposal when one is pending", async () => {
        await tokenInstance.proposeMint(1337);

        try {
          await tokenInstance.proposeMint(100);
        } catch (error) {
          assert(error);
          assert.equal(error.reason, "Can not add a proposal while one is pending", `Incorrect revert reason: ${error.reason}`);
        }
      });

      it("should NOT be able to sign multiple times", async () => {
        await tokenInstance.proposeGrant(ALICE);
        await tokenInstance.sign({ from: OWNER_2 });
        await tokenInstance.proposeGrant(BOB);
        await tokenInstance.sign({ from: ALICE });

        try {
          await tokenInstance.sign({ from: ALICE });
        } catch (error) {
          assert.equal(
            error.reason,
            "Signatory has already signed this proposal",
            `Incorrect revert reason: ${error.reason}`);
        }
      });

      it("should be in voting period", async () => {
        await tokenInstance.proposeMint(1337);

        const actual = await tokenInstance.inVotingPeriod();
        assert.equal(actual, true, "Voting should be allowed");
      });

      it("should NOT be able to sign when there are no open proposals", async() => {
        try {
          await tokenInstance.sign({ from: OWNER });
        } catch (error) {
          assert(error);
          assert.equal(error.reason, "Proposal is closed", `Incorrect revert reason: ${error.reason}`);
        }
      });
    })

    describe("Granting and Revoking Signatories", () => {
      beforeEach(async () => {
        tokenInstance = await Token.new();

        await tokenInstance.proposeGrant(OWNER_2);
        await tokenInstance.proposeGrant(OWNER_3);
      });

      it("should be initialised with 3 authorities", async () => {
        let actual = await tokenInstance.authorised(OWNER);
        assert.isTrue(actual, "OWNER should be authorised");

        actual = await tokenInstance.authorised(OWNER_2);
        assert.isTrue(actual, "OWNER_2 should be authorised");

        actual = await tokenInstance.authorised(OWNER_3);
        assert.isTrue(actual, "OWNER_3 should be authorised");
      });

      it("should reduce count when removing an authority", async () => {
        await tokenInstance.proposeGrant(ALICE);
        await tokenInstance.sign({ from: OWNER_2 });

        var count = await tokenInstance.authorisedCount();
        assert.equal(new BN(count), 4, "Authorised count should be 4");

        await tokenInstance.proposeRevoke(OWNER_3);
        await tokenInstance.sign({ from: OWNER_2 });
        await tokenInstance.sign({ from: ALICE });

        count = await tokenInstance.authorisedCount();
        assert.equal(new BN(count), 3, "Authorised count should be 3");
      });

      it("should NOT be able to add an existing signatory", async () => {
        try {
          const result = await tokenInstance.proposeGrant(OWNER_2);
        } catch (error) {
          assert.equal(error.reason, "Access already granted", `Incorrect revert reason: ${error.reason}`);
        }

        const count = await tokenInstance.authorisedCount();
        assert.equal(Number(count), 3, "Authorised count should be 3");
      });

      it("should NOT revoke authority when the minimum number of authorities are available",
      async () => {
        try {
          await tokenInstance.proposeRevoke(OWNER_2);
        } catch (error) {
          assert.equal(error.reason, "Can not revoke authority. Minimum authorities required", `Incorrect revert reason: ${error.reason}`);
        }
      })
    });

    describe("Minting", async () => {
      beforeEach(async () => {
        tokenInstance = await Token.new();

        await tokenInstance.proposeGrant(OWNER_2);
        await tokenInstance.proposeGrant(OWNER_3);
      });

      it("should add proposal to mint 1337 tokens", async () => {
        await tokenInstance.proposeMint(1337);
        await tokenInstance.sign({ from: OWNER_2 })

        const balance = await tokenInstance.balanceOf(OWNER);
        assert.equal(Number(balance), 0, "Balance should still be 0");

        const latestProposal = new BN(await tokenInstance.getProposalsCount()) - 1;
        const proposal = await tokenInstance.proposals(latestProposal);
        const mintProposal = await tokenInstance.mintProposals(latestProposal);

        assert.equal(new BN(mintProposal), 1337, "Proposal amount should be 1337");
        assert.equal(proposal.who, OWNER, "Proposal owner should be Owner");
        assert.isFalse(proposal.open);
      });
    });
  });

  describe("With 10,000 tokens minted balance", async () => {

    beforeEach(async () => {
      tokenInstance = await Token.new();

      await tokenInstance.proposeGrant(OWNER_2);
      await tokenInstance.proposeGrant(ALICE);

      await tokenInstance.proposeMint(10000);
      await tokenInstance.sign( {from: OWNER_2} );
    });

    it("should issue contract with 10,000 tokens after minting", async () => {
      const actual = await tokenInstance.balanceOf(tokenInstance.address);
      assert.equal(Number(actual), 10000, "Contract balance should be 10,000");
    });
  });

  describe("Purchase and transfer tests", async () => {
    beforeEach(async () => {
      tokenInstance = await Token.new();

      await tokenInstance.proposeGrant(OWNER_2);
      await tokenInstance.proposeGrant(ALICE);

      await tokenInstance.proposeMint(10000);
      await tokenInstance.sign({ from: OWNER_2 });

      await tokenInstance.purchase(ALICE, 100, 100, 100);
    });

    it("should transfer 10 tokens from alice to bob", async () => {
      var actual = await tokenInstance.balanceOf(ALICE);
      assert.equal(Number(actual), 100, "Alice balance should be 100 tokens");

      await tokenInstance.transfer(BOB, 10, { from: ALICE });
      actual = await tokenInstance.balanceOf(ALICE);

      assert.equal(Number(actual), 90, "Alice balance should be 90 tokens");

      actual = await tokenInstance.balanceOf(BOB);
      assert.equal(Number(actual), 10, "Bob balance should be 10 tokens");
    });

    it("alice should allow owner to transfer 50 tokens to bob from alice", async () => {
      await tokenInstance.approve(OWNER, 50, { from: ALICE });

      //account 0 (owner) now transfers from alice to bob
      await tokenInstance.transferFrom(ALICE, BOB, 50, { from: OWNER });
      var actual = await tokenInstance.balanceOf(BOB);
      assert.equal(Number(actual), 50, "Balance should be 50");
    });

    it("should not allow transfer to zero address", async () => {
      try {
        await tokenInstance.transfer(0, 10);
      } catch (error) {
        assert(error);
        assert.equal(error.reason, "invalid address", `Incorrect revert reason: ${error.reason}`
        );
      }
    });

    it("should not allow sending by user with insuffient tokens", async () => {
      await tokenInstance.transfer(BOB, 10, { from: ALICE });
      try {
        await tokenInstance.transfer(ALICE, 1000, { from: BOB });
      } catch (error) {
        assert(error);
        console.log(error.reason);
        assert.equal(error.reason, "Insufficient funds", `Incorrect revert reason: ${error.reason}`);
      }
    });

    it("should allow owner 10 tokens from alice", async () => {
      var actual = await tokenInstance.balanceOf(ALICE);
      assert.equal(Number(actual), 100, "Alice balance should be 100 tokens");
    });
  });

  describe("Trade history tests", () => {
    beforeEach(async () => {
      tokenInstance = await Token.new();

      await tokenInstance.updateAuthorised(OWNER_2, true);
      await tokenInstance.updateAuthorised(ALICE, true);

      await tokenInstance.addProposal(10000);
      await tokenInstance.vote({ from: OWNER_2});
    });

    it.skip("should get trade count", async () => {
      await tokenInstance.purchase(BOB, 100, 1500, 270);
      await tokenInstance.purchase(BOB, 100, 1500, 270);
      await tokenInstance.purchase(BOB, 100, 1500, 270);

      const actual = await tokenInstance.getTotalTradeCount();
      assert.equal(Number(actual), 3, "Trade count should be 3");
    });

    it.skip("should get alice trade count", async () => {
      await tokenInstance.purchase(BOB, 100, 1500, 270);
      await tokenInstance.purchase(ALICE, 100, 1500, 270);
      await tokenInstance.purchase(BOB, 100, 1500, 270);

      const actual = await tokenInstance.getAccountTradeCount(ALICE);
      assert.equal(Number(actual), 1, "Trade count should be 1");
    });

    it.skip("should get alice trade indexes", async () => {
      await tokenInstance.purchase(BOB, 100, 1500, 270);
      await tokenInstance.purchase(ALICE, 100, 1500, 270);
      await tokenInstance.purchase(ALICE, 100, 1500, 270);
      await tokenInstance.purchase(BOB, 100, 1500, 270);

      const actual = await tokenInstance.getAccountTradesIndexs(ALICE);
      console.log(new BN(actual).toString());

      assert.equal(Number(actual[0]), 1, "Index should be 1");
      assert.equal(Number(actual[1]), 2, "Index should be 2");
    });
  });
});
