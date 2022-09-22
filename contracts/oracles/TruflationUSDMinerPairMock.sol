// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.2 <0.9.0;

contract TruflationUSDMinerPairMock {
    /**
     * The initial x MUSD : 1 Miner ratio - E.g. 3 USD : 1 MINER.
     */
    uint256 public initialRate;

    constructor(uint256 initialRate_) {
        initialRate = initialRate_;
    }

    /**
     * 1 miner is x USD.
     */
    function getTodaysExchangeRate() external view returns (uint256 rate) {
        rate =
            initialRate +
            uint256((int256(initialRate) * _getTodaysInflationRate()) / 1e18);
    }

    /**
     * What is today's inflation rate in relation to the initial rate as a
     * percentage.
     */
    function getTodaysInflationRate() external view returns (int256 rate) {
        return _getTodaysInflationRate();
    }

    function _getTodaysInflationRate() internal view returns (int256 rate) {
        rate = 1e17;
    }
}
