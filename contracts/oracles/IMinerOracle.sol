// SPDX-License-Identifier: GPL-3.0-only

pragma solidity ^0.6.0;

interface IMinerOracle {
    function setExchangeRate(uint rate) external;

    function getExchangeRate(uint blockNumber) external view returns (uint, uint);

    function getLatestExchangeRate() external view returns (uint, uint);
}
