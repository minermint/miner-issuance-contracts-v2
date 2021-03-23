const { BN, constants, expectEvent, expectRevert } = require("@openzeppelin/test-helpers");
const { expect } = require("chai");
const { ZERO_ADDRESS, MAX_UINT256 } = constants;

const Miner = artifacts.require("Miner");
const Issuance = artifacts.require("Issuance");
const MinerUSDOracle = artifacts.require("MinerUSDOracle");
const PriceFeed = artifacts.require("PriceFeedTestToken");
const TokenSwap = artifacts.require("TokenSwap");
const TestToken = artifacts.require("TestToken");

contract("TokenSwap", (accounts) => {
    const OWNER = accounts[0];
    const MINTER = accounts[1];

    const ALICE = accounts[3];
    const BOB = accounts[4];

    const ZERO_BALANCE = new BN(0);

    const EXCHANGE_RATE = new BN("150000000"); // $1.50 to 8 dp.

    let miner, issuance, tokenSwap, testToken, aggregator;

    const decimals = new BN("18");
    const supply = new BN("1000").mul(new BN("10").pow(decimals));

    beforeEach(async () => {
        miner = await Miner.new();
        await miner.setMinter(MINTER);

        aggregator = await PriceFeed.deployed();
        oracle = await MinerUSDOracle.deployed();

        oracle.setExchangeRate(EXCHANGE_RATE);

        issuance = await Issuance.new(miner.address);

        await miner.mint(supply, { from: MINTER });
        await miner.transfer(issuance.address, supply, { from: MINTER });

        tokenSwap = await TokenSwap.new(oracle.address, issuance.address);
        issuance.addIssuer(tokenSwap.address);

        testToken = await TestToken.new();
    });

    it("should register a token", async () => {
        const expected = {
            "token": testToken.address,
            "priceFeedOracle": aggregator.address,
            "enabled": true
        }

        await tokenSwap.registerSwap(testToken.address, aggregator.address);

        expect(await tokenSwap.swaps(testToken.address)).to.include(expected);
    });

    it('should emit SwapRegistered event', async () => {
        const { logs } = await tokenSwap.registerSwap(
            testToken.address,
            aggregator.address
        );

        const event = expectEvent.inLogs(logs, 'SwapRegistered', {
            token: testToken.address,
            priceFeedOracle: aggregator.address,
        });
    });

    it("should NOT register an invalid token address", async() => {
        await expectRevert(
            tokenSwap.registerSwap(
                BOB,
                aggregator.address
            ),
            "TokenSwap/token-invalid"
        );
    });

    it("should NOT register an invalid oracle address", async() => {
        await expectRevert(
            tokenSwap.registerSwap(
                testToken.address,
                BOB
            ),
            "TokenSwap/oracle-invalid"
        );
    });

    it("should NOT register a token without permission", async() => {
        await expectRevert(
            tokenSwap.registerSwap(
                aggregator.address,
                testToken.address,
                { from: BOB }
            ),
            "Issuance/no-admin-privileges"
        );
    });

    it("should NOT register a token twice", async () => {
        await tokenSwap.registerSwap(testToken.address, aggregator.address);

        await expectRevert(
            tokenSwap.registerSwap(testToken.address, aggregator.address),
            "TokenSwap/token-already-registered"
        );
    });

    it("should get a total count of token swaps", async () => {
        const expected = new BN(1);
        await tokenSwap.registerSwap(testToken.address, aggregator.address);

        const actual = await tokenSwap.getSwapAddressCount();

        expect(actual).to.be.bignumber.equal(expected);
    });

    it("should get a token's conversion rate", async () => {
        await tokenSwap.registerSwap(testToken.address, aggregator.address);

        const exchangeRate = await oracle.getLatestExchangeRate();
        const by10e18 = (new BN("10")).pow(decimals);
        const rate = exchangeRate[0].mul(by10e18);

        const roundData = await aggregator.latestRoundData();
        const tokenUSDPrice = roundData[1];

        const expected = rate.div(tokenUSDPrice);
        const actual = await tokenSwap.getConversionRate(testToken.address);

        expect(actual).to.be.bignumber.equal(expected);
    });

    it("should NOT update a swap if not registered", async () => {
        await expectRevert(
            tokenSwap.updateSwapOracle(testToken.address, aggregator.address),
            "TokenSwap/token-not-registered"
        );
    });

    it("should deregister a token", async () => {
        const expected = {
            "token": testToken.address,
            "priceFeedOracle": aggregator.address,
            "enabled": false
        }

        await tokenSwap.registerSwap(testToken.address, aggregator.address);

        await tokenSwap.deregisterSwap(testToken.address);

        expect(await tokenSwap.swaps(testToken.address)).to.include(expected);
    });

    it('should emit SwapDeregistered event', async () => {
        const { logs } = await tokenSwap.deregisterSwap(testToken.address);

        const event = expectEvent.inLogs(logs, 'SwapDeregistered', {
            token: testToken.address
        });
    });

    describe("update", async () => {
        beforeEach(async () => {
            await tokenSwap.registerSwap(testToken.address, aggregator.address);
        });

        it("should NOT update a swap with an invalid token", async () => {
            await expectRevert(
                tokenSwap.updateSwapOracle(testToken.address, BOB),
                "TokenSwap/oracle-invalid"
            );
        });

        it("should NOT update a swap with an invalid oracle", async () => {
            await expectRevert(
                tokenSwap.updateSwapOracle(testToken.address, BOB),
                "TokenSwap/oracle-invalid"
            );
        });

        it("should update a token's oracle", async () => {
            const expected = {
                "token": testToken.address,
                "priceFeedOracle": aggregator.address,
                "enabled": true
            };

            await tokenSwap.updateSwapOracle(testToken.address, aggregator.address);

            expect(await tokenSwap.swaps(testToken.address)).to.include(expected);
        });

        it('should emit SwapOracleUpdated event', async () => {
            const { logs } = await tokenSwap.updateSwapOracle(
                testToken.address,
                aggregator.address
            );

            const event = expectEvent.inLogs(logs, 'SwapOracleUpdated', {
                token: testToken.address,
                oldPriceFeedOracle: aggregator.address,
                newPriceFeedOracle: aggregator.address
            });
        });

        it("should NOT update a swap with an invalid oracle", async () => {
            await expectRevert(
                tokenSwap.updateSwapOracle(testToken.address, BOB),
                "TokenSwap/oracle-invalid"
            );
        });
    });

    describe("converting", async () => {
        let amount, minerMin;

        beforeEach(async () => {
            const power = (new BN("10")).pow(await aggregator.decimals());
            amount = (new BN("1")).mul(power);

            await tokenSwap.registerSwap(testToken.address, aggregator.address);

            // increase the min miner beyond what will be converted.
            minerMin = await tokenSwap.getConversionAmount(
                testToken.address,
                amount
            );

            await testToken.transfer(ALICE, amount);

            await testToken.approve(tokenSwap.address, MAX_UINT256, { from: ALICE });
        });

        it("should exchange TestToken for Miner", async() => {
            await tokenSwap.convert(testToken.address, amount, minerMin, { from: ALICE });

            const balance = await testToken.balanceOf(tokenSwap.address);

            const escrowed = (await tokenSwap.swaps(testToken.address)).escrowed;

            expect(balance).to.be.bignumber.equal(escrowed);
        });

        it("should NOT exchange TestToken for Miner when amount is zero",
            async() => {
            const ZERO_AMOUNT = new BN("0");

            await expectRevert(
                tokenSwap.convert(testToken.address, ZERO_AMOUNT, minerMin, { from: ALICE }),
                "TokenSwap/deposit-invalid"
            );
        });

        it("should NOT convert if price falls below slippage", async () => {
            await expectRevert(
                tokenSwap.convert(
                    testToken.address,
                    amount,
                    minerMin.add(new web3.utils.BN(1)),
                    {
                        from: ALICE
                    }
                ),
                "EthSwap/slippage"
            );
        });
    });

    describe("admin", async () => {
        describe("access control", async () => {
            const ADMIN = web3.utils.soliditySha3("ADMIN");

            it("should transfer ownership and set the new owner as an admin",
            async () => {
                await tokenSwap.transferOwnership(ALICE);
                const newOwner = await tokenSwap.owner();
                const isAdmin = await tokenSwap.hasRole(ADMIN, ALICE);

                expect(newOwner).to.be.equal(ALICE);
                expect(isAdmin).to.be.true;
            });

            it('should emit OwnershipTransferred event', async () => {
                const { logs } = await tokenSwap.transferOwnership(ALICE);

                const event = expectEvent.inLogs(logs, 'OwnershipTransferred', {
                    previousOwner: OWNER,
                    newOwner: ALICE,
                });
            });
        });

        describe("withdrawals", async () => {
            const amount = new BN("1").mul(new BN("10").pow(decimals));

            beforeEach(async () => {
                await testToken.transfer(ALICE, amount);
            });

            it("should withdraw TestToken and set contract escrow to zero",
            async () => {
                const minerMin = new BN("0"); // TODO: make this a proper min.
                const ownerBalance = await testToken.balanceOf(OWNER);

                await tokenSwap.registerSwap(testToken.address, aggregator.address);

                await testToken.approve(tokenSwap.address, MAX_UINT256, { from: ALICE });

                await tokenSwap.convert(testToken.address, amount, minerMin, { from: ALICE });

                await tokenSwap.withdraw(testToken.address);

                const escrowed = (await tokenSwap.swaps(testToken.address)).escrowed;
                const balance = await testToken.balanceOf(tokenSwap.address);

                expect(escrowed).to.be.bignumber.equal(new BN(0));
                expect(balance).to.be.bignumber.equal(new BN(0));
            });

            it("should withdraw TestToken and credit owner's account", async () => {
                const amount = new BN("1").mul(new BN("10").pow(decimals));
                const minerMin = new BN("0"); // TODO: make this a proper min.
                const ownerBalance = await testToken.balanceOf(OWNER);
                const expected = ownerBalance.add(amount);

                await tokenSwap.registerSwap(testToken.address, aggregator.address);

                await testToken.approve(tokenSwap.address, MAX_UINT256, { from: ALICE });

                await tokenSwap.convert(testToken.address, amount, minerMin, { from: ALICE });

                await tokenSwap.withdraw(testToken.address);

                const balance = await testToken.balanceOf(OWNER);

                expect(balance).to.be.bignumber.equal(expected);
            });


            it("should emit Withdrawn event", async () => {
                const amount = new BN("1").mul(new BN("10").pow(decimals));
                const minerMin = new BN("0"); // TODO: make this a proper min.
                const ownerBalance = await testToken.balanceOf(OWNER);
                const expected = ownerBalance.add(amount);

                await tokenSwap.registerSwap(testToken.address, aggregator.address);

                await testToken.approve(tokenSwap.address, MAX_UINT256, { from: ALICE });

                await tokenSwap.convert(testToken.address, amount, minerMin, { from: ALICE });

                const { logs } = await tokenSwap.withdraw(testToken.address);

                const event = expectEvent.inLogs(logs, 'Withdrawn', {
                    token: testToken.address,
                    recipient: OWNER,
                    amount: amount,
                });
            });
        });
    });
});
