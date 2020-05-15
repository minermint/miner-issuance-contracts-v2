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

  describe("ERC20 tests", async () => {
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
  });

  describe("Roles and permissions tests", async () => {

    beforeEach(async () => {
      tokenInstance = await Token.new();

      await tokenInstance.updateAuthorised(OWNER_2, true);
      await tokenInstance.updateAuthorised(OWNER_3, true);
    });

    it("should be deployed in truffle with 3 authorities", async () => {
      let actual = await tokenInstance.authorised(OWNER);
      assert.isTrue(actual, "OWNER should be authorised");

      actual = await tokenInstance.authorised(OWNER_2);
      assert.isTrue(actual, "OWNER_2 should be authorised");

      actual = await tokenInstance.authorised(OWNER_3);
      assert.isTrue(actual, "OWNER_3 should be authorised");
    });

    it("should allow owner to update authority", async () => {
      const result = await tokenInstance.updateAuthorised(ALICE, true);

      const actual = await tokenInstance.authorised(ALICE);
      assert.isTrue(actual, "Alice should be authorised");

      const count = await tokenInstance.authorisedCount();
      assert.equal(Number(count), 4, "Authorised count should be 4");
    });

    it("should reduce count when removing an authority", async () => {
      await tokenInstance.updateAuthorised(ALICE, true);

      await tokenInstance.updateAuthorised(OWNER_2, false);

      const actual = await tokenInstance.authorised(OWNER_2);
      assert.isFalse(actual, "OWNER_2 should not be authorised");

      const count = await tokenInstance.authorisedCount();
      assert.equal(Number(count), 3, "Authorised count should be 3");
    });

    it("should not increase count when attempting to add an existing authority", async () => {
      const result = await tokenInstance.updateAuthorised(OWNER_2, true);

      const actual = await tokenInstance.authorised(OWNER_2);
      assert.isTrue(actual, "OWNER_2 should still be authorised");

      const count = await tokenInstance.authorisedCount();
      assert.equal(Number(count), 3, "Authorised count should be 3");
    });

    it("should NOT revoke authority when the minimum number of authorities are available",
    async () => {
      try {
        await tokenInstance.updateAuthorised(OWNER_2, false);
      } catch (error) {
        assert.equal(error.reason, "Can not revoke authority. Minimum authorities required", `Incorrect revert reason: ${error.reason}`);
      }
    })

    it("should NOT revoke authority when less than the minimum number of authorities are available",
    async () => {
      tokenInstance = await Token.new();

      try {
        await tokenInstance.updateAuthorised(OWNER_2, true);
        await tokenInstance.updateAuthorised(OWNER_2, false);
      } catch (error) {
        assert.equal(error.reason, "Can not revoke authority. Minimum authorities required", `Incorrect revert reason: ${error.reason}`);
      }
    })
  });

  describe("With less than required authorities tests", async () => {

    beforeEach(async () => {
      tokenInstance = await Token.new();

      await tokenInstance.updateAuthorised(OWNER_2, true);
    });

    it("should not be able to add proposal when not enough authorities", async () => {
      try {
        await tokenInstance.addProposal(42);
      } catch (error) {
        assert(error);
        assert.equal(error.reason, "Must have at least three signatories", `Incorrect revert reason: ${error.reason}`);
      }
    });
  });

  describe("With required authorities tests", async () => {

    beforeEach(async () => {
      tokenInstance = await Token.new();

      await tokenInstance.updateAuthorised(OWNER_2, true);
      await tokenInstance.updateAuthorised(OWNER_3, true);
    });

    it("should add proposal to mint 1337 tokens", async () => {
      await tokenInstance.addProposal(1337);

      const balance = await tokenInstance.balanceOf(OWNER);
      assert.equal(Number(balance), 0, "Balance should still be 0");

      const actual = await tokenInstance.proposals(0);
      assert.equal(Number(actual[0]), 1337, "Proposal amount should be 1337");
      assert.equal(Number(actual[1]), OWNER, "Proposal owner should be Owner");
      assert.isTrue(actual.open);
    });

    it("should not be able to add a proposal when one is pending", async () => {
      await tokenInstance.addProposal(1337);

      const actual = await tokenInstance.proposals(0);
      assert.isTrue(actual.open);

      try {
        await tokenInstance.addProposal(42);
      } catch (error) {
        assert(error);
        assert.equal(error.reason, "Can not add a proposal while one is pending", `Incorrect revert reason: ${error.reason}`);
      }
    });

    it("should be in voting period", async () => {
      await tokenInstance.addProposal(1337);

      const actual = await tokenInstance.inVotingPeriod();
      assert.equal(actual, true, "Voting should be allowed");
    });
  });

  describe("Vote tests", async () => {
    beforeEach(async () => {
      tokenInstance = await Token.new();

      await tokenInstance.updateAuthorised(OWNER_2, true);
      await tokenInstance.updateAuthorised(ALICE, true);

      await tokenInstance.addProposal(1337);
    });

    it("should not be able to vote on own proposal", async () => {
      try {
        await tokenInstance.vote();
      } catch (error) {
        assert(error);
        assert.equal(error.reason, "Cannot approve own proposal", `Incorrect revert reason: ${error.reason}`);
      }
    });

    it.skip("should vote on proposal 0", async () => {
      const proposal = await tokenInstance.proposals(0);
      console.log(proposal);

      assert.isTrue(proposal.open);
      assert.equal(proposal.who, OWNER, "Should be owner");

      console.log(OWNER_2);
      await tokenInstance.vote({ from: OWNER_2 });
      //const actual = await tokenInstance.votes(0, OWNER_2);
      //assert.equal(actual, true, "Vote should be true");

      const actual = await tokenInstance.balanceOf(tokenInstance.address);
      assert.equal(Number(actual), 1337, "Contract balance should be 1337");
    });

    it("should not be able to vote when there are no proposals", async() => {
      try {
        await tokenInstance.vote({ from: OWNER_2 });
      } catch (error) {
        assert(error);
        assert.equal(error.reason, "No proposals have been submitted", `Incorrect revert reason: ${error.reason}`);
      }
    });
  });

  describe("With 10,000 tokens minted balance", async () => {

    beforeEach(async () => {
      tokenInstance = await Token.new();

      await tokenInstance.updateAuthorised(OWNER_2, true);
      await tokenInstance.updateAuthorised(ALICE, true);

      await tokenInstance.addProposal(10000);
      await tokenInstance.vote({from: OWNER_2});
    });

    it("should issue contract with 10,000 tokens after minting", async () => {
      const actual = await tokenInstance.balanceOf(tokenInstance.address);
      assert.equal(Number(actual), 10000, "Contract balance should be 10,000");
    });
  });

  describe("Purchase and transfer tests", async () => {

    beforeEach(async () => {
      tokenInstance = await Token.new();

      await tokenInstance.updateAuthorised(OWNER_2, true);
      await tokenInstance.updateAuthorised(ALICE, true);

      await tokenInstance.addProposal(10000);
      await tokenInstance.vote({ from: OWNER_2});

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

    it("owner should allow owner to transfer 50 tokens to bob from alice", async () => {
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

    it.skip("Owner should allow alice to transfer 10 tokens to bob from owner", async () => {
      await tokenInstance.approve(OWNER, 10, {from: ALICE});

      //account 0 (owner) now transfers from alice to bob
      await tokenInstance.transferFrom(OWNER, BOB, 10, { from: ALICE });
      const actual = await tokenInstance.balanceOf(BOB);
      assert.equal(Number(actual), 10, "Balance should be 10");
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

    it("should get trade count", async () => {
      await tokenInstance.purchase(BOB, 100, 1500, 270);
      await tokenInstance.purchase(BOB, 100, 1500, 270);
      await tokenInstance.purchase(BOB, 100, 1500, 270);

      const actual = await tokenInstance.getTotalTradeCount();
      assert.equal(Number(actual), 3, "Trade count should be 3");
    });

    it("should get alice trade count", async () => {
      await tokenInstance.purchase(BOB, 100, 1500, 270);
      await tokenInstance.purchase(ALICE, 100, 1500, 270);
      await tokenInstance.purchase(BOB, 100, 1500, 270);

      const actual = await tokenInstance.getAccountTradeCount(ALICE);
      assert.equal(Number(actual), 1, "Trade count should be 1");
    });

    it("should get alice trade indexes", async () => {
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
