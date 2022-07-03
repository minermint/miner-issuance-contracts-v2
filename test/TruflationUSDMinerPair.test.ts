import { ethers, waffle, deployments, getNamedAccounts } from "hardhat";
import { Contract } from "ethers";
import { expect } from "chai";

describe("TruflationUSDMinerPair", () => {
    let deployer: any;
    let owner: any;
    let issuer: any;
    let alice: any;
    let bob: any;

    // $3 to 8 dp.
    const EXCHANGE_RATE = ethers.utils.parseUnits("3", 8);

    let pair: Contract;

    before(async () => {
        ({ deployer, owner, issuer, alice, bob } = await getNamedAccounts());
    });

    beforeEach(async () => {
        await deployments.fixture(["all"]);
        pair = await ethers.getContract("TruflationUSDMinerPairMock");
    });

    it("should report today's inflation rate", async () => {
        expect(await pair.getTodaysInflationRate()).to.be.equal(
            ethers.utils.parseEther("0.1")
        );
    });

    it("should report today's exchange rate", async () => {
        expect(await pair.getTodaysExchangeRate()).to.be.equal(
            ethers.utils
                .parseUnits("3", 8)
                .add(
                    ethers.utils
                        .parseUnits("3", 8)
                        .mul(ethers.utils.parseEther("0.1"))
                        .div(ethers.utils.parseEther("1"))
                )
        );
    });
});
