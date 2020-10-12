pragma solidity ^0.6.0;

interface IMinerOracle {
    function setExchangeRate(string calldata currencyCode, uint rate) external;

    function getExchangeRate(uint blockNumber) external view returns (string memory, uint, uint);

    function getLatestExchangeRate() external view returns (string memory, uint, uint);

    function getLatestMinerEth() external view returns (uint);
}
