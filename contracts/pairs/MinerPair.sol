pragma solidity ^0.6.0;

import "@chainlink/contracts/src/v0.6/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

import "../IMinerOracle.sol";
import "./IMinerPair.sol";

abstract contract MinerPair is Ownable, IMinerPair {
    using SafeMath for uint256;

    IMinerOracle private _minerOracle;
    AggregatorV3Interface private _priceFeedOracle;

    function setMinerOracle(IMinerOracle minerOracle) public onlyOwner {
         _minerOracle = minerOracle;
    }

    function setPriceFeedOracle(AggregatorV3Interface priceFeedOracle) public onlyOwner {
        _priceFeedOracle = priceFeedOracle;
    }

    function getConversionRate() external override view returns (uint256) {
        return _getConversionRate();
    }

    function _getConversionRate() internal view returns (uint256) {
        ( , uint256 rate, ) = _minerOracle.getLatestExchangeRate();

        ( , int256 answer, , , ) = _priceFeedOracle.latestRoundData();

        // latest per miner price * by 18 dp, divide by latest price per eth.
        return rate.mul(1e18).div(uint(answer));
    }

    function convert(uint256 amount) external override view returns (uint256) {
        uint256 conversionRate = _getConversionRate();

        // multiply sent eth by 10^18 so that it transfers the correct amount of
        // miner.
        return amount.mul(1e18).div(conversionRate);
    }
}
