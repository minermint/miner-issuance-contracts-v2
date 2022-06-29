// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.0 <0.9.0;

import "./MinerOracle.sol";

/// @title Provide a single source of truth for Miner Token price in USD.
contract MinerUSDOracle is MinerOracle {
    constructor() {
        currencyCode = "USD";
    }
}
