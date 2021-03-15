// SPDX-License-Identifier: GPL-3.0-only

pragma solidity >=0.6.2 <0.8.0;

import "@chainlink/contracts/src/v0.6/interfaces/AggregatorV3Interface.sol";

contract PriceFeedTestToken is AggregatorV3Interface {
    function decimals() external override view returns (uint8) {
        return 8;
    }

    function description() external override view returns (string memory) {
        return "DAI / USD";
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
        return _latestRoundData();
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
        return _latestRoundData();
    }

    function _latestRoundData()
        internal
        pure
        returns (
            uint80,
            int256,
            uint256,
            uint256,
            uint80
        )
    {
        return (
            18446744073709555131,
            100000000,
            1605441620,
            1605441620,
            18446744073709555131
        );
    }

    function version() external override view returns (uint256) {
        return 2;
    }
}
