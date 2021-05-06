// SPDX-License-Identifier: GPL-3.0-only

pragma solidity >=0.6.2 <0.8.0;

import "./MinerOracle.sol";

contract MinerUSDOracle is MinerOracle {
    constructor() public {
        currencyCode = "USD";
    }

    function getRates() external pure returns (uint256) {
        return 100;
    }
}
