pragma solidity ^0.6.0;

import "./MinerPair.sol";

contract MinerEthPair is MinerPair {
    using SafeMath for uint256;

    constructor(IMinerOracle minerOracle, AggregatorV3Interface priceFeedOracle) public {
        setMinerOracle(minerOracle);
        setPriceFeedOracle(priceFeedOracle);
    }
}
