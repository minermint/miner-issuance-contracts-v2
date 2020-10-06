pragma solidity ^0.6.0;

interface IMinerOracle {
    function setMinerUSD(uint minerUSD) external;

    function getMinerUSD() external view returns (uint);

    function getLatestMinerEth() external view returns (uint);
}
