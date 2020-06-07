const { BN, constants, expectEvent, expectRevert } = require("@openzeppelin/test-helpers");
const { ZERO_ADDRESS } = constants;
const { expect } = require("chai");

var Miner = artifacts.require("./Miner.sol");

contract("Miner", accounts => {
    const symbol = "MINER";
    const name = "Miner";
    const decimals = new BN("4");
    const initialSupply = new BN("0").mul(new BN("10").pow(decimals));
    const mintedSupply = new BN("1000000").mul(new BN("10").pow(decimals));

    const initialHolder = accounts[0];
    const recipient = accounts[1];
    const anotherAccount = accounts[2];

    beforeEach(async function() {
		this.token = await Miner.new();
	})

    describe("instantiation", function () {
        it("should have a name of miner", async function() {
            expect(await this.token.name()).to.be.bignumber.equal(name);
        });

        it("should have a symbol of MINER", async function() {
            expect(await this.token.symbol()).to.be.bignumber.equal(symbol);
        })

    	it("should initiate a total supply of 0 Miner tokens.", async function() {
    		expect(await this.token.totalSupply()).to.be.bignumber.equal(initialSupply);
    	})

        it("should have no minter assigned.", async function() {
            expect(await this.token.getMinter()).to.be.bignumber.equal(ZERO_ADDRESS);
        })
    });

    describe("minting", function () {
        it("should not mint when no minter assigned", async function () {
            await expectRevert(this.token.mint(mintedSupply), "Miner/invalid-minter");
        });

        describe("when a minter is set", function () {
            beforeEach(async function () {
                await this.token.setMinter(recipient);

                const { logs } = await this.token.mint(mintedSupply, { from: recipient });
                this.logs = logs;
            });

            it("should have a minter assigned", async function () {
                const minter = await this.token.getMinter();
                expect(minter).to.be.equal(recipient);
            })

            it("should allow the minter to increase supply", async function () {
                expect(await this.token.balanceOf(recipient)).to.be.bignumber.equal(mintedSupply);
            });

            it('should emit Transfer event', async function () {
                const event = expectEvent.inLogs(this.logs, 'Transfer', {
                    from: ZERO_ADDRESS,
                    to: recipient,
                });

                expect(event.args.value).to.be.bignumber.equal(mintedSupply);
            });

            it("should not assign zero address", async function () {
                const to = ZERO_ADDRESS;
                await expectRevert(this.token.setMinter(to), "Miner/zero-address");
            });
        });
    });

    describe("transferral and allowance", function() {
        beforeEach(async function() {
            await this.token.setMinter(initialHolder);
            await this.token.mint(mintedSupply);
        })

        describe("transfer", function() {
            const to = recipient;

            describe("for an existing recipient", function() {
                describe("when the sender has enough balance", function() {
                    const amount = mintedSupply;

                    it("should transfer Miner to another account.", async function() {
                        await this.token.transfer(to, amount);

                        expect(await this.token.balanceOf(initialHolder)).to.be.bignumber.equal("0");

                        expect(await this.token.balanceOf(to)).to.be.bignumber.equal(amount);
                    })

                    it("should emit a transfer event", async function () {
                        const { logs } = await this.token.transfer(to, amount);

                        expectEvent.inLogs(logs, "Transfer", {
                            from: initialHolder,
                            to: to,
                            value: amount,
                        });
                    });
                })

                describe("when the sender does not have enough balance", function() {
                    const amount = mintedSupply.addn(1);

                    it("should revert", async function () {
                        await expectRevert(this.token.transfer(to, amount), "ERC20: transfer amount exceeds balance");
                    });
                });
            })

            describe("when the recipient is the zero address", function () {
                const to = ZERO_ADDRESS;

                it("should revert", async function () {
                    await expectRevert(this.token.transfer(to, mintedSupply, { from: initialHolder }), "ERC20: transfer to the zero address");
                });
            });
        })

        describe("approve", function () {
            describe("when the spender is not the zero address", function () {
                const spender = recipient;

                describe("when the sender has enough balance", function () {
                    const amount = mintedSupply;

                    it("should emit an approval event", async function () {
                        const { logs } = await this.token.approve(spender, amount);

                        expectEvent.inLogs(logs, "Approval", {
                            owner: initialHolder,
                            spender: spender,
                            value: amount,
                        });
                    });

                    describe("when there was no approved amount before", function () {
                        it("should approve the requested amount", async function () {
                            await this.token.approve(spender, amount);

                            expect(await this.token.allowance(initialHolder, spender)).to.be.bignumber.equal(amount);
                        });
                    });

                    describe("when the spender had an approved amount", function () {
                        beforeEach(async function () {
                            await this.token.approve(spender, new BN(1));
                        });

                        it("should approve the requested amount and replaces the previous one", async function () {
                            await this.token.approve(spender, amount);

                            expect(await this.token.allowance(initialHolder, spender)).to.be.bignumber.equal(amount);
                        });
                    });
                });

                describe("when the sender does not have enough balance", function () {
                    const amount = mintedSupply.addn(1);

                    it("should emit an approval event", async function () {
                        const { logs } = await this.token.approve(spender, amount);

                        expectEvent.inLogs(logs, "Approval", {
                            owner: initialHolder,
                            spender: spender,
                            value: amount,
                        });
                    });

                    describe("when there was no approved amount before", function () {
                        it("should approve the requested amount", async function () {
                            await this.token.approve(spender, amount);

                            expect(await this.token.allowance(initialHolder, spender)).to.be.bignumber.equal(amount);
                        });
                    });

                    describe("when the spender had an approved amount", function () {
                        beforeEach(async function () {
                            await this.token.approve(spender, new BN(1));
                        });

                        it("should approve the requested amount and replaces the previous one", async function () {
                            await this.token.approve(spender, amount);

                            expect(await this.token.allowance(initialHolder, spender)).to.be.bignumber.equal(amount);
                        });
                    });
                });
            });

            describe("when the spender is the zero address", function () {
                const amount = mintedSupply;
                const spender = ZERO_ADDRESS;

                it("should revert", async function () {
                    await expectRevert(this.token.approve(spender, amount), "ERC20: approve to the zero address.");
                });
            });
        });

        describe("transferFrom", function () {
            const spender = recipient;

                describe("when the recipient is not the zero address or token contract", function () {
                    const to = anotherAccount;

                    describe("when the spender has enough approved balance", function () {
                        beforeEach(async function () {
                            await this.token.approve(spender, mintedSupply, { from: initialHolder });
                        });

                        describe("when the initial holder has enough balance", function () {
                            const amount = mintedSupply;

                            it("should transfer the requested amount", async function () {
                                await this.token.transferFrom(initialHolder, to, amount, { from: spender });

                                expect(await this.token.balanceOf(initialHolder)).to.be.bignumber.equal("0");

                                expect(await this.token.balanceOf(to)).to.be.bignumber.equal(amount);
                            });

                            it("should decrease the spender allowance", async function () {
                                await this.token.transferFrom(initialHolder, to, amount, { from: spender });

                                expect(await this.token.allowance(initialHolder, spender)).to.be.bignumber.equal("0");
                            });

                            it("should emit a transfer event", async function () {
                                const { logs } = await this.token.transferFrom(initialHolder, to, amount, { from: spender });

                                expectEvent.inLogs(logs, "Transfer", {
                                    from: initialHolder,
                                    to: to,
                                    value: amount,
                                });
                            });

                            it("should emit an approval event", async function () {
                                const { logs } = await this.token.transferFrom(initialHolder, to, amount, { from: spender });

                                expectEvent.inLogs(logs, "Approval", {
                                    owner: initialHolder,
                                    spender: spender,
                                    value: await this.token.allowance(initialHolder, spender),
                                });
                            });
                        });

                        describe("when the spender does not have enough balance", function () {
                            const amount = initialSupply.addn(1);

                            it("should revert", async function () {
                                await expectRevert(this.token.transferFrom(spender, to, amount, { from: initialHolder }), "ERC20: transfer amount exceeds balance");
                            });
                        });
                    });

                    describe("when the recipient is the zero address", function () {
                        const amount = mintedSupply;
                        const to = ZERO_ADDRESS;

                        beforeEach(async function () {
                            await this.token.approve(spender, amount);
                        });

                        it("should revert", async function () {
                            await expectRevert(this.token.transferFrom(initialHolder, to, amount), "ERC20: transfer to the zero address");
                    });
                });
            });
        });

        describe("decreaseAllowance", function () {
            describe("when the spender is not the zero address", function () {
                const spender = recipient;

                function shouldDecreaseApproval (amount) {
                    describe("when there was no approved amount before", function () {
                        it("should revert", async function () {
                            await expectRevert(this.token.decreaseAllowance(spender, amount, { from: initialHolder }), "ERC20: decreased allowance below zero");
                        });
                    });

                    describe("when the spender had an approved amount", function () {
                        const approvedAmount = amount;

                        beforeEach(async function () {
                            ({ logs: this.logs } = await this.token.approve(spender, approvedAmount, { from: initialHolder }));
                        });

                        it("should emit an approval event", async function () {
                            const { logs } = await this.token.decreaseAllowance(spender, approvedAmount, { from: initialHolder });

                            expectEvent.inLogs(logs, "Approval", {
                                owner: initialHolder,
                                spender: spender,
                                value: new BN(0),
                            });
                        });

                        it("should decrease the spender allowance subtracting the requested amount", async function () {
                            await this.token.decreaseAllowance(spender, approvedAmount.subn(1), { from: initialHolder });

                            expect(await this.token.allowance(initialHolder, spender)).to.be.bignumber.equal("1");
                        });

                        it("should set the allowance to zero when all allowance is removed", async function () {
                            await this.token.decreaseAllowance(spender, approvedAmount, { from: initialHolder });
                            expect(await this.token.allowance(initialHolder, spender)).to.be.bignumber.equal("0");
                        });

                        it("should revert when more than the full allowance is removed", async function () {
                            await expectRevert(
                                this.token.decreaseAllowance(spender, approvedAmount.addn(1), { from: initialHolder })
                            , "Reason given: ERC20: decreased allowance below zero");
                        });
                    });
                }

                describe("when the sender has enough balance", function () {
                    const amount = mintedSupply;

                    shouldDecreaseApproval(amount);
                });

                describe("when the sender does not have enough balance", function () {
                    const amount = mintedSupply.addn(1);

                    shouldDecreaseApproval(amount);
                });
            });

            describe("when the spender is the zero address", function () {
                const amount = mintedSupply;
                const spender = ZERO_ADDRESS;

                it("should revert", async function () {
                    await expectRevert(this.token.decreaseAllowance(spender, amount, { from: initialHolder }), "ERC20: decreased allowance below zero");
                });
            });
        });

        describe("increaseAllowance", function () {
            const amount = mintedSupply;

            describe("when the spender is not the zero address", function () {
                const spender = recipient;

                describe("when the sender has enough balance", function () {
                    it("should emit an approval event", async function () {
                        const { logs } = await this.token.increaseAllowance(spender, amount, { from: initialHolder });

                        expectEvent.inLogs(logs, "Approval", {
                            owner: initialHolder,
                            spender: spender,
                            value: amount,
                        });
                    });

                    describe("when there was no approved amount before", function () {
                        it("should approve the requested amount", async function () {
                            await this.token.increaseAllowance(spender, amount, { from: initialHolder });

                            expect(await this.token.allowance(initialHolder, spender)).to.be.bignumber.equal(amount);
                        });
                    });

                    describe("when the spender had an approved amount", function () {
                        beforeEach(async function () {
                            await this.token.approve(spender, new BN(1), { from: initialHolder });
                        });

                        it("should increase the spender allowance adding the requested amount", async function () {
                            await this.token.increaseAllowance(spender, amount, { from: initialHolder });

                            expect(await this.token.allowance(initialHolder, spender)).to.be.bignumber.equal(amount.addn(1));
                        });
                    });
                });

                describe("when the sender does not have enough balance", function () {
                    const amount = mintedSupply.addn(1);

                    it("should emit an approval event", async function () {
                        const { logs } = await this.token.increaseAllowance(spender, amount, { from: initialHolder });

                        expectEvent.inLogs(logs, "Approval", {
                            owner: initialHolder,
                            spender: spender,
                            value: amount,
                        });
                    });

                    describe("when there was no approved amount before", function () {
                        it("should approve the requested amount", async function () {
                            await this.token.increaseAllowance(spender, amount, { from: initialHolder });

                            expect(await this.token.allowance(initialHolder, spender)).to.be.bignumber.equal(amount);
                        });
                    });

                    describe("when the spender had an approved amount", function () {
                        beforeEach(async function () {
                            await this.token.approve(spender, new BN(1), { from: initialHolder });
                        });

                        it("should increase the spender allowance adding the requested amount", async function () {
                            await this.token.increaseAllowance(spender, amount, { from: initialHolder });

                            expect(await this.token.allowance(initialHolder, spender)).to.be.bignumber.equal(amount.addn(1));
                        });

                        it("should overwrite the previously approved amount", async function () {
                            await this.token.approve(spender, new BN(2), { from: initialHolder});

                            expect(await this.token.allowance(initialHolder, spender)).to.be.bignumber.equal(new BN(2));

                        });
                    });
                });
            });
        });
    });
});
