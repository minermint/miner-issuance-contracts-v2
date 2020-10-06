pragma solidity ^0.6.0;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@chainlink/contracts/src/v0.6/interfaces/AggregatorV3Interface.sol";
import "./IMinerOracle.sol";

contract MinerOracle is IMinerOracle {
    using SafeMath for uint256;

    AggregatorV3Interface internal priceFeed;
    uint _minerUSD;

    constructor(address priceFeedAddress) public {
        priceFeed = AggregatorV3Interface(priceFeedAddress);
    }

    function setMinerUSD(uint minerUSD) override external {
        _minerUSD = minerUSD;
    }

    function getMinerUSD() override external view returns (uint) {
        return _getMinerUSD();
    }

    function _getMinerUSD() private view returns (uint) {
        return _minerUSD;
    }

    function getLatestMinerEth() override external view returns (uint) {
        (
            uint80 roundID,
            int price,
            uint startedAt,
            uint timeStamp,
            uint80 answeredInRound
        ) = priceFeed.latestRoundData();

        uint ethPrice = (_getMinerUSD().mul(1e18)).div(uint256(price));
        return ethPrice;
    }
}
