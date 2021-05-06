// SPDX-License-Identifier: GPL-3.0-only

pragma solidity >=0.6.2 <0.8.0;

import "@chainlink/contracts/src/v0.6/interfaces/AggregatorV3Interface.sol";

contract PriceFeedETH is AggregatorV3Interface {
    function decimals() external override view returns (uint8) {
        return 5;
    }

    function description() external override view returns (string memory) {
        return "Price Feed";
    }

    function getRoundData(uint80 _roundId)
        external
        override
        view
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
            35298000000,
            1601911848,
            1601911848,
            18446744073709563481
        );
    }

    function latestRoundData()
        external
        override
        view
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
            35298000000,
            1601911848,
            1601911848,
            18446744073709563481
        );
    }

    function version() external override view returns (uint256) {
        return 1;
    }
}
