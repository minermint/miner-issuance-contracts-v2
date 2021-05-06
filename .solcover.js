module.exports = {
    skipFiles: [
        "IERC20.sol",
        "Ownable.sol",
        "SafeMath.sol"
    ],
    client: require('ganache-cli')
};
