const { BN, constants, expectEvent, expectRevert } = require("@openzeppelin/test-helpers");
const { expect } = require("chai");
const { ZERO_ADDRESS, MAX_UINT256 } = constants;

const Miner = artifacts.require("Miner");
const Issuance = artifacts.require("Issuance");
const MinerOracle = artifacts.require("MinerOracle");
const PriceFeed = artifacts.require("PriceFeedTestToken");
const TokenSwap = artifacts.require("TokenSwap");
const TestToken = artifacts.require("TestToken");

contract("TokenSwap", (accounts) => {
    const OWNER = accounts[0];
    const MINTER = accounts[1];

    const ALICE = accounts[3];
    const BOB = accounts[4];

    const ZERO_BALANCE = new BN(0);

    const CURRENCY_CODE = "USD";
    const EXCHANGE_RATE = new BN("150000000"); // $1.50 to 8 dp.

    let miner, issuance, tokenSwap, testToken;

    const decimals = new BN("18");
    const supply = new BN("1000").mul(new BN("10").pow(decimals));

    beforeEach(async () => {
        miner = await Miner.new();
        await miner.setMinter(MINTER);

        aggregator = await PriceFeed.deployed();
        oracle = await MinerOracle.deployed();

        oracle.setExchangeRate(CURRENCY_CODE, EXCHANGE_RATE);

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

        await tokenSwap.registerSwap(aggregator.address, testToken.address);

        expect(await tokenSwap.swaps(testToken.address)).to.include(expected);
    });

    it("should deregister a token", async () => {
        const expected = {
            "token": testToken.address,
            "priceFeedOracle": aggregator.address,
            "enabled": false
        }

        await tokenSwap.registerSwap(aggregator.address, testToken.address);

        await tokenSwap.deregisterSwap(testToken.address);

        expect(await tokenSwap.swaps(testToken.address)).to.include(expected);
    });

    it("should NOT register a token without permission", async() => {
        await expectRevert(
            tokenSwap.registerSwap(
                aggregator.address,
                testToken.address,
                { from: BOB }
            ),
            "Ownable: caller is not the owner."
        );
    });

    it.only("should exchange TestToken for Miner", async() => {
        const amount = new BN("1").mul(new BN("10").pow(decimals));
        const minerMin = new BN("0"); // TODO: make this a proper min.

        await tokenSwap.registerSwap(aggregator.address, testToken.address);

        await testToken.transfer(ALICE, amount);

        await testToken.approve(tokenSwap.address, MAX_UINT256, { from: ALICE });

        await tokenSwap.convert(testToken.address, amount, minerMin, { from: ALICE });
    })
});
