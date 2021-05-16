// SPDX-License-Identifier: GPL-3.0-only

pragma solidity >=0.6.2 <0.8.0;

import "./MinerOracle.sol";

/// @title Provide a single source of truth for Miner Token price in USD.
/// @author hayden.y@minertoken.io
contract MinerUSDOracle is MinerOracle {
    constructor() public {
        currencyCode = "USD";
    }
}
