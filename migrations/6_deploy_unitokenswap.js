const UniTokenSwap = artifacts.require("UniTokenSwap");
const EthSwap = artifacts.require("./EthSwap");

module.exports = async function(deployer) {
    console.log(process.env);
    const uniswapFactoryAddress = process.env.UNISWAP_FACTORY;
    const minerAddress = process.env.MINER;

    const ethSwap = await EthSwap.deployed();

    console.log(ethSwap.address);

    await deployer.deploy(
        UniTokenSwap,
        ethSwap.address,
        uniswapFactoryAddress,
        minerAddress
    );
}
