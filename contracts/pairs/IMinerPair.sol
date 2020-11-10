pragma solidity ^0.6.0;

interface IMinerPair {
    function getConversionRate() external view returns (uint);

    function convert(uint256 amount) external view returns (uint256);
}
