// SPDX-License-Identifier: GPL-3.0-only

pragma solidity ^0.6.0;

import "./MinerOracle.sol";

contract MinerUSDOracle is MinerOracle {
    constructor() public {
        currencyCode = "USD";
    }
}
