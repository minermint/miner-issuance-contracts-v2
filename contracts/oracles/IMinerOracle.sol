// SPDX-License-Identifier: GPL-3.0-only

pragma solidity >=0.6.2 <0.8.0;

interface IMinerOracle {
    function setExchangeRate(uint256 rate) external;

    function getExchangeRate(uint256 blockNumber)
        external
        view
        returns (uint256, uint256);

    function getLatestExchangeRate() external view returns (uint256, uint256);
}
