// SPDX-License-Identifier: GPL-3.0-only

pragma solidity >=0.8.0 <0.9.0;

import "@chainlink/contracts/src/v0.6/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract PriceFeedETHMock is AggregatorV3Interface {
    using SafeMath for uint256;

    function decimals() external pure override returns (uint8) {
        return 8;
    }

    function description() external pure override returns (string memory) {
        return "Price Feed";
    }

    function getRoundData(uint80 _roundId)
        external
        pure
        override
        returns (
            uint80,
            int256,
            uint256,
            uint256,
            uint80
        )
    {
        require(_roundId > 0, "no-round-id");
        return (
            18446744073709563481,
            _getRate(),
            1601911848,
            1601911848,
            18446744073709563481
        );
    }

    function latestRoundData()
        external
        pure
        override
        returns (
            uint80,
            int256,
            uint256,
            uint256,
            uint80
        )
    {
        return (
            18446744073709563481,
            _getRate(),
            1601911848,
            1601911848,
            18446744073709563481
        );
    }

    function version() external pure override returns (uint256) {
        return 1;
    }

    // 1 USD = 0.001 ETH
    function _getRate() internal pure returns (int256) {
        uint256 rate = 100000000000;

        return int256(rate);
    }
}
