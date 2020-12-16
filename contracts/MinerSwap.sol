// SPDX-License-Identifier: GPL-3.0-only

pragma solidity ^0.6.0;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@chainlink/contracts/src/v0.6/interfaces/AggregatorV3Interface.sol";

import "./oracles/IMinerOracle.sol";
import "./Issuance.sol";

abstract contract MinerSwap is Ownable {
    IMinerOracle public minerOracle;

    Issuance public issuance;

    function setMinerOracle(IMinerOracle minerOracleAddress) public onlyOwner {
         minerOracle = minerOracleAddress;
    }

    function setIssuance(Issuance issuanceAddress) public onlyOwner {
        issuance = issuanceAddress;
    }
}
