// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.0 <0.9.0;

interface IMinerOracle {
    function setExchangeRate(uint256 rate) external;

    function getExchangeRate(uint256 blockNumber)
        external
        view
        returns (uint256, uint256);

    function getLatestExchangeRate() external view returns (uint256, uint256);
}
