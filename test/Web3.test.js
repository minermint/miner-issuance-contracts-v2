const Miner = artifacts.require("Miner");
const Issuance = artifacts.require("Issuance");

//const keythereum = require("keythereum");

const { BN } = require("@openzeppelin/test-helpers");

const HDWalletProvider = require("@truffle/hdwallet-provider");
const Web3 = require("web3")

const { expect } = require("chai");

const { abi } = require("../networks/development/Issuance")

//const BigNumber = require('bignumber.js')

contract("Web3", (accounts) => {
    const OWNER = accounts[0];
    const OWNER_2 = accounts[1];
    const OWNER_3 = accounts[2];

    const ALICE = accounts[3];
    const BOB = accounts[4];

    let miner, issuance;

    beforeEach(async () => {
        miner = await Miner.new();
        issuance = await Issuance.new(miner.address);
        await miner.setMinter(OWNER);
    });

/*
(0) 0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1 (100 ETH)
(1) 0xFFcf8FDEE72ac11b5c542428B35EEF5769C409f0 (100 ETH)
(2) 0x22d491Bde2303f2f43325b2108D26f1eAbA1e32b (100 ETH)
(3) 0xE11BA2b4D45Eaed5996Cd0823791E0C93114882d (100 ETH)
(4) 0xd03ea8624C8C5987235048901fB614fDcA89b117 (100 ETH)
(5) 0x95cED938F7991cd0dFcb48F0a06a40FA1aF46EBC (100 ETH)
(6) 0x3E5e9111Ae8eB78Fe1CC3bb8915d5D461F3Ef9A9 (100 ETH)
(7) 0x28a8746e75304c0780E011BEd21C72cD78cd535E (100 ETH)
(8) 0xACa94ef8bD5ffEE41947b4585a84BdA5a3d3DA6E (100 ETH)
(9) 0x1dF62f291b2E969fB0849d99D9Ce41e2F137006e (100 ETH)

(0) 0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d
(1) 0x6cbed15c793ce57650b9877cf6fa156fbef513c4e6134f022a85b1ffdd59b2a1
(2) 0x6370fd033278c143179d81c5526140625662b8daa446c22ee2d73db3707e620c
(3) 0x646f1ce2fdad0e6deeeb5c7e8e5543bdde65e86029e2fd9fc169899c440a7913
(4) 0xadd53f9a7e588d003326d1cbf9e4a43c061aadd9bc938c843a79e7b4fd2ad743
(5) 0x395df67f0c2d2d9fe1ad08d1bc8b6627011959b79c53d7dd6a3536a33ab8a4fd
(6) 0xe485d098507f54e7733a205420dfddbe58db035fa577fc294ebd14db90767a52
(7) 0xa453611d9419d0e56f499079478fd72c37b251a94bfde4d19872c44cf65386e3
(8) 0x829e924fdf021ba3dbbc4225edfece9aca04b929d6e75613329ca6f1d31c0bb4
(9) 0xb0057716d5917badaf911b193b12b910811c1497b5bada8d7711f758981c3773
*/

    describe("Web3", () => {
        it("should create a new address", async () => {
            const mnemonic = "myth like bonus scare over problem client lizard pioneer submit female collect";
            const provider = new HDWalletProvider(mnemonic, "http://localhost:8545");
            const web3 = new Web3(provider);
            const wallet = web3.eth.accounts.wallet.create();
            wallet.add(web3.eth.accounts.create());
            wallet.add(web3.eth.accounts.create());
            console.log(web3.eth.accounts.wallet);

            console.log(await web3.eth.getAccounts())

            provider.engine.stop();
        });

        it.only("should issue miner to multiple accounts", async () => {
            const mnemonic = "myth like bonus scare over problem client lizard pioneer submit female collect";
            const provider = new HDWalletProvider(mnemonic, "http://localhost:8545");
            const web3 = new Web3(provider);
            const issuanceContract = new web3.eth.Contract(abi)

            //const chainId = await web3.eth.getChainId();
            await miner.mint(10000000000000)
            await miner.transfer(issuance.address, 10000000000000)

            let issue = issuanceContract.methods.issue("OWNER_2", 100000000).encodeABI();

            web3.eth.sendTransaction({
                from: OWNER,
                to: issuance.address,
                data: issue,
                chain: "development",
            });

            issue = issuanceContract.methods.issue(OWNER_3, 100000000).encodeABI();

            result = web3.eth.sendTransaction({
                from: OWNER,
                to: issuance.address,
                data: issue,
                chain: "development",
            });

            console.log((await miner.balanceOf(OWNER_2)).toString())
            console.log((await miner.balanceOf(OWNER_3)).toString())
        })
/*
        it("should bignumber", async () => {
            let amount = new BigNumber(7.5);
            const padding = new BigNumber(10).exponentiatedBy(18);
            amount = amount.times(padding);
            console.log(amount.toString());
            console.log(Web3.utils.toWei("7.5"))
        })
*/
        it("should get gas price", async () => {
            const mnemonic = "myth like bonus scare over problem client lizard pioneer submit female collect";
            const provider = new HDWalletProvider(mnemonic, "http://localhost:8545");
            const web3 = new Web3(provider);
            const gasPrice = new BigNumber(await web3.eth.getGasPrice());
            console.log("Gas Price is " + gasPrice.toString() + " wei"); // "10000000000000"

            var contract = new web3.eth.Contract(Miner._json.abi);
            console.log(contract)
            //var contractData = MinerContract.new.getData({data: Miner._json.bytecode});
            //var gas = Number(web3.eth.estimateGas({data: contractData}))


            //console.log("gas estimation = " + gas + " units");
            //console.log("gas cost estimation = " + (gas * gasPrice) + " wei");
            //console.log("gas cost estimation = " + web3.fromWei((gas * gasPrice), 'ether') + " ether");
        })
    });
});
