// SPDX-License-Identifier: GPL-3.0-only

pragma solidity ^0.6.0;

import "@chainlink/contracts/src/v0.6/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

import "./oracles/IMinerOracle.sol";
import "./Issuance.sol";

abstract contract MinerSwap is Ownable {
    IMinerOracle public minerOracle;

    Issuance public issuance;

    constructor(
        IMinerOracle minerOracleAddress,
        Issuance issuanceAddress) public
    {
        setMinerOracle(minerOracleAddress);
        setIssuance(issuanceAddress);
    }

    function setMinerOracle(IMinerOracle minerOracleAddress) public onlyOwner {
         minerOracle = minerOracleAddress;
    }

    function setIssuance(Issuance issuanceAddress) public onlyOwner {
        issuance = issuanceAddress;
    }
}
