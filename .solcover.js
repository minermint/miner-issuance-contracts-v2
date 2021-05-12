module.exports = {
    skipFiles: [
        "IERC20.sol",
        "Ownable.sol",
        "SafeMath.sol",
        "DaiMock.sol",
        "PriceFeedETHMock.sol",
        "UniswapV2Router02Mock.sol",
        "WETHMock.sol"
    ],
    client: require('ganache-cli')
};
