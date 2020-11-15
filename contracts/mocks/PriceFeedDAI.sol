pragma solidity ^0.6.0;

import "@chainlink/contracts/src/v0.6/interfaces/AggregatorV3Interface.sol";

contract PriceFeedDAI is AggregatorV3Interface {
    function decimals() override external view returns (uint8) {
        return 8;
    }

    function description() override external view returns (string memory) {
        return "DAI / USD";
    }

    function getRoundData(uint80 _roundId) override external view returns (uint80, int256, uint256, uint256, uint80) {
        return _latestRoundData();
    }

    function latestRoundData() override external view returns (uint80, int256, uint256, uint256, uint80) {
        return _latestRoundData();
    }

    function _latestRoundData() internal view returns (uint80, int256, uint256, uint256, uint80) {
        return(18446744073709555131, 100000000, 1605441620, 1605441620, 18446744073709555131);
    }

    function version() override external view returns (uint256) {
        return 2;
    }
}
