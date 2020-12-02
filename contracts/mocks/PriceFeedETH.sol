// SPDX-License-Identifier: GPL-3.0-only

pragma solidity ^0.6.0;

import "@chainlink/contracts/src/v0.6/interfaces/AggregatorV3Interface.sol";

contract PriceFeedETH is AggregatorV3Interface {
    function decimals() override external view returns (uint8) {
        return 5;
    }

    function description() override external view returns (string memory) {
        return "Price Feed";
    }

    function getRoundData(uint80 _roundId) override external view returns (uint80, int256, uint256, uint256, uint80) {
        return(18446744073709563481, 35298000000, 1601911848, 1601911848, 18446744073709563481);
    }

    function latestRoundData() override external view returns (uint80, int256, uint256, uint256, uint80) {
        return(18446744073709563481, 35298000000, 1601911848, 1601911848, 18446744073709563481);
    }

    function version() override external view returns (uint256) {
        return 1;
    }
}
