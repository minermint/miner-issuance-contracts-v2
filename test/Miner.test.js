const { BN, constants, expectEvent, expectRevert } = require("@openzeppelin/test-helpers");
const { ZERO_ADDRESS } = constants;
const { expect } = require("chai");

const Miner = artifacts.require("./Miner.sol");

contract("Miner", accounts => {
    const symbol = "MINER";
    const name = "Miner";
    const decimals = new BN("18");
    const initialSupply = new BN("0").mul(new BN("10").pow(decimals));
    const mintedSupply = new BN("1000000").mul(new BN("10").pow(decimals));

    const initialHolder = accounts[0];
    const recipient = accounts[1];
    const anotherAccount = accounts[2];

    let token;
    let eventLogs;

    beforeEach(async () => {
		token = await Miner.new();
	})

    describe("instantiation", () => {
        it("should have a name of miner", async () => {
            expect(await token.name()).to.be.equal(name);
        });

        it("should have a symbol of MINER", async () => {
            expect(await token.symbol()).to.be.equal(symbol);
        });

        it("should initiate a total supply of 0 Miner tokens.", async () => {
            expect(await token.totalSupply()).to.be.bignumber.equal(
                initialSupply
            );
        });

        it("should have no minter assigned.", async () => {
            expect(await token.getMinter()).to.be.bignumber.equal(ZERO_ADDRESS);
        });
    });

    describe("minting", () => {
        it("should not mint when no minter assigned", async () => {
            await expectRevert(token.mint(mintedSupply), "Miner/invalid-minter");
        });

        describe("when a minter is set", () => {
            beforeEach(async () => {
                await token.setMinter(recipient);

                const { logs } = await token.mint(mintedSupply, { from: recipient });
                eventLogs = logs;
            });

            it("should have a minter assigned", async () => {
                const minter = await token.getMinter();
                expect(minter).to.be.equal(recipient);
            })

            it("should allow the minter to increase supply", async () => {
                expect(await token.balanceOf(recipient)).to.be.bignumber.equal(mintedSupply);
            });

            it('should emit Transfer event', async () => {
                const event = expectEvent.inLogs(eventLogs, 'Transfer', {
                    from: ZERO_ADDRESS,
                    to: recipient,
                });

                expect(event.args.value).to.be.bignumber.equal(mintedSupply);
            });

            it("should not assign zero address", async () => {
                const to = ZERO_ADDRESS;
                await expectRevert(token.setMinter(to), "Miner/zero-address");
            });
        });
    });

    describe("transferral and allowance", () => {
        beforeEach(async () => {
            await token.setMinter(initialHolder);
            await token.mint(mintedSupply);
        })

        describe("transfer", () => {
            const to = recipient;

            describe("for an existing recipient", () => {
                describe("when the sender has enough balance", () => {
                    const amount = mintedSupply;

                    it("should transfer Miner to another account.", async () => {
                        await token.transfer(to, amount);

                        expect(await token.balanceOf(initialHolder)).to.be.bignumber.equal("0");

                        expect(await token.balanceOf(to)).to.be.bignumber.equal(amount);
                    })

                    it("should emit a transfer event", async () => {
                        const { logs } = await token.transfer(to, amount);

                        expectEvent.inLogs(logs, "Transfer", {
                            from: initialHolder,
                            to: to,
                            value: amount,
                        });
                    });
                })

                describe("when the sender does not have enough balance", () => {
                    const amount = mintedSupply.addn(1);

                    it("should revert", async () => {
                        await expectRevert(token.transfer(to, amount), "ERC20: transfer amount exceeds balance");
                    });
                });
            })

            describe("when the recipient is the zero address", () => {
                const to = ZERO_ADDRESS;

                it("should revert", async () => {
                    await expectRevert(token.transfer(to, mintedSupply, { from: initialHolder }), "ERC20: transfer to the zero address");
                });
            });
        })

        describe("approve", () => {
            describe("when the spender is not the zero address", () => {
                const spender = recipient;

                describe("when the sender has enough balance", () => {
                    const amount = mintedSupply;

                    it("should emit an approval event", async () => {
                        const { logs } = await token.approve(spender, amount);

                        expectEvent.inLogs(logs, "Approval", {
                            owner: initialHolder,
                            spender: spender,
                            value: amount,
                        });
                    });

                    describe("when there was no approved amount before", () => {
                        it("should approve the requested amount", async () => {
                            await token.approve(spender, amount);

                            expect(await token.allowance(initialHolder, spender)).to.be.bignumber.equal(amount);
                        });
                    });

                    describe("when the spender had an approved amount", () => {
                        beforeEach(async () => {
                            await token.approve(spender, new BN(1));
                        });

                        it("should approve the requested amount and replaces the previous one", async () => {
                            await token.approve(spender, amount);

                            expect(await token.allowance(initialHolder, spender)).to.be.bignumber.equal(amount);
                        });
                    });
                });

                describe("when the sender does not have enough balance", () => {
                    const amount = mintedSupply.addn(1);

                    it("should emit an approval event", async () => {
                        const { logs } = await token.approve(spender, amount);

                        expectEvent.inLogs(logs, "Approval", {
                            owner: initialHolder,
                            spender: spender,
                            value: amount,
                        });
                    });

                    describe("when there was no approved amount before", () => {
                        it("should approve the requested amount", async () => {
                            await token.approve(spender, amount);

                            expect(await token.allowance(initialHolder, spender)).to.be.bignumber.equal(amount);
                        });
                    });

                    describe("when the spender had an approved amount", () => {
                        beforeEach(async () => {
                            await token.approve(spender, new BN(1));
                        });

                        it("should approve the requested amount and replaces the previous one", async () => {
                            await token.approve(spender, amount);

                            expect(await token.allowance(initialHolder, spender)).to.be.bignumber.equal(amount);
                        });
                    });
                });
            });

            describe("when the spender is the zero address", () => {
                const amount = mintedSupply;
                const spender = ZERO_ADDRESS;

                it("should revert", async () => {
                    await expectRevert(token.approve(spender, amount), "ERC20: approve to the zero address");
                });
            });
        });

        describe("transferFrom", () => {
            const spender = recipient;

                describe("when the recipient is not the zero address or token contract", () => {
                    const to = anotherAccount;

                    describe("when the spender has enough approved balance", () => {
                        beforeEach(async () => {
                            await token.approve(spender, mintedSupply, { from: initialHolder });
                        });

                        describe("when the initial holder has enough balance", () => {
                            const amount = mintedSupply;

                            it("should transfer the requested amount", async () => {
                                await token.transferFrom(initialHolder, to, amount, { from: spender });

                                expect(await token.balanceOf(initialHolder)).to.be.bignumber.equal("0");

                                expect(await token.balanceOf(to)).to.be.bignumber.equal(amount);
                            });

                            it("should decrease the spender allowance", async () => {
                                await token.transferFrom(initialHolder, to, amount, { from: spender });

                                expect(await token.allowance(initialHolder, spender)).to.be.bignumber.equal("0");
                            });

                            it("should emit a transfer event", async () => {
                                const { logs } = await token.transferFrom(initialHolder, to, amount, { from: spender });

                                expectEvent.inLogs(logs, "Transfer", {
                                    from: initialHolder,
                                    to: to,
                                    value: amount,
                                });
                            });

                            it("should emit an approval event", async () => {
                                const { logs } = await token.transferFrom(initialHolder, to, amount, { from: spender });

                                expectEvent.inLogs(logs, "Approval", {
                                    owner: initialHolder,
                                    spender: spender,
                                    value: await token.allowance(initialHolder, spender),
                                });
                            });
                        });

                        describe("when the spender does not have enough balance", () => {
                            const amount = initialSupply.addn(1);

                            it("should revert", async () => {
                                await expectRevert(token.transferFrom(spender, to, amount, { from: initialHolder }), "ERC20: transfer amount exceeds balance");
                            });
                        });
                    });

                    describe("when the recipient is the zero address", () => {
                        const amount = mintedSupply;
                        const to = ZERO_ADDRESS;

                        beforeEach(async () => {
                            await token.approve(spender, amount);
                        });

                        it("should revert", async () => {
                            await expectRevert(token.transferFrom(initialHolder, to, amount), "ERC20: transfer to the zero address");
                    });
                });
            });
        });

        describe("decreaseAllowance", () => {
            describe("when the spender is not the zero address", () => {
                const spender = recipient;

                function shouldDecreaseApproval (amount) {
                    describe("when there was no approved amount before", () => {
                        it("should revert", async () => {
                            await expectRevert(token.decreaseAllowance(spender, amount, { from: initialHolder }), "ERC20: decreased allowance below zero");
                        });
                    });

                    describe("when the spender had an approved amount", () => {
                        const approvedAmount = amount;

                        beforeEach(async () => {
                            ({ logs: eventLogs } = await token.approve(spender, approvedAmount, { from: initialHolder }));
                        });

                        it("should emit an approval event", async () => {
                            const { logs } = await token.decreaseAllowance(spender, approvedAmount, { from: initialHolder });

                            expectEvent.inLogs(logs, "Approval", {
                                owner: initialHolder,
                                spender: spender,
                                value: new BN(0),
                            });
                        });

                        it("should decrease the spender allowance subtracting the requested amount", async () => {
                            await token.decreaseAllowance(spender, approvedAmount.subn(1), { from: initialHolder });

                            expect(await token.allowance(initialHolder, spender)).to.be.bignumber.equal("1");
                        });

                        it("should set the allowance to zero when all allowance is removed", async () => {
                            await token.decreaseAllowance(spender, approvedAmount, { from: initialHolder });
                            expect(await token.allowance(initialHolder, spender)).to.be.bignumber.equal("0");
                        });

                        it("should revert when more than the full allowance is removed", async () => {
                            await expectRevert(
                                token.decreaseAllowance(spender, approvedAmount.addn(1), { from: initialHolder })
                            , "ERC20: decreased allowance below zero");
                        });
                    });
                }

                describe("when the sender has enough balance", () => {
                    const amount = mintedSupply;

                    shouldDecreaseApproval(amount);
                });

                describe("when the sender does not have enough balance", () => {
                    const amount = mintedSupply.addn(1);

                    shouldDecreaseApproval(amount);
                });
            });

            describe("when the spender is the zero address", () => {
                const amount = mintedSupply;
                const spender = ZERO_ADDRESS;

                it("should revert", async () => {
                    await expectRevert(token.decreaseAllowance(spender, amount, { from: initialHolder }), "ERC20: decreased allowance below zero");
                });
            });
        });

        describe("increaseAllowance", () => {
            const amount = mintedSupply;

            describe("when the spender is not the zero address", () => {
                const spender = recipient;

                describe("when the sender has enough balance", () => {
                    it("should emit an approval event", async () => {
                        const { logs } = await token.increaseAllowance(spender, amount, { from: initialHolder });

                        expectEvent.inLogs(logs, "Approval", {
                            owner: initialHolder,
                            spender: spender,
                            value: amount,
                        });
                    });

                    describe("when there was no approved amount before", () => {
                        it("should approve the requested amount", async () => {
                            await token.increaseAllowance(spender, amount, { from: initialHolder });

                            expect(await token.allowance(initialHolder, spender)).to.be.bignumber.equal(amount);
                        });
                    });

                    describe("when the spender had an approved amount", () => {
                        beforeEach(async () => {
                            await token.approve(spender, new BN(1), { from: initialHolder });
                        });

                        it("should increase the spender allowance adding the requested amount", async () => {
                            await token.increaseAllowance(spender, amount, { from: initialHolder });

                            expect(await token.allowance(initialHolder, spender)).to.be.bignumber.equal(amount.addn(1));
                        });
                    });
                });

                describe("when the sender does not have enough balance", () => {
                    const amount = mintedSupply.addn(1);

                    it("should emit an approval event", async () => {
                        const { logs } = await token.increaseAllowance(spender, amount, { from: initialHolder });

                        expectEvent.inLogs(logs, "Approval", {
                            owner: initialHolder,
                            spender: spender,
                            value: amount,
                        });
                    });

                    describe("when there was no approved amount before", () => {
                        it("should approve the requested amount", async () => {
                            await token.increaseAllowance(spender, amount, { from: initialHolder });

                            expect(await token.allowance(initialHolder, spender)).to.be.bignumber.equal(amount);
                        });
                    });

                    describe("when the spender had an approved amount", () => {
                        beforeEach(async () => {
                            await token.approve(spender, new BN(1), { from: initialHolder });
                        });

                        it("should increase the spender allowance adding the requested amount", async () => {
                            await token.increaseAllowance(spender, amount, { from: initialHolder });

                            expect(await token.allowance(initialHolder, spender)).to.be.bignumber.equal(amount.addn(1));
                        });

                        it("should overwrite the previously approved amount", async () => {
                            await token.approve(spender, new BN(2), { from: initialHolder});

                            expect(await token.allowance(initialHolder, spender)).to.be.bignumber.equal(new BN(2));

                        });
                    });
                });
            });
        });
    });
});
