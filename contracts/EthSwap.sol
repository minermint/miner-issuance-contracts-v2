// SPDX-License-Identifier: GPL-3.0-only

pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/payment/PullPayment.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@chainlink/contracts/src/v0.6/interfaces/AggregatorV3Interface.sol";

import "./IMinerOracle.sol";
import "./Issuance.sol";

contract EthSwap is Ownable, PullPayment {
    using SafeMath for uint256;

    IMinerOracle private _minerOracle;
    AggregatorV3Interface private _priceFeedOracle;
    Issuance _issuance;

    constructor(
        IMinerOracle minerOracle,
        AggregatorV3Interface priceFeedOracle,
        Issuance issuance
    ) public {
        setMinerOracle(minerOracle);
        setPriceFeedOracle(priceFeedOracle);
        setIssuance(issuance);
    }

    function setMinerOracle(IMinerOracle minerOracle) public onlyOwner {
         _minerOracle = minerOracle;
    }

    function setPriceFeedOracle(AggregatorV3Interface priceFeedOracle) public onlyOwner {
        _priceFeedOracle = priceFeedOracle;
    }

    function setIssuance(Issuance issuance) public onlyOwner {
        _issuance = issuance;
    }

    function getConversionRate() external view returns (uint256) {
        return _getConversionRate();
    }

    function _getConversionRate() internal view returns (uint256) {
        ( , uint256 rate, ) = _minerOracle.getLatestExchangeRate();

        ( , int256 answer, , , ) = _priceFeedOracle.latestRoundData();

        // latest per miner price * by 18 dp, divide by latest price per eth.
        return rate.mul(1e18).div(uint(answer));
    }

    function getConversionAmount(uint256 amount) public view returns (uint256) {
        uint256 conversionRate = _getConversionRate();

        // multiply sent eth by 10^18 so that it transfers the correct amount of
        // miner.
        return amount.mul(1e18).div(conversionRate);
    }

    function convert() external payable {
        address owner = owner();
        uint256 eth = msg.value;

        require(eth > 0, "Issuance/deposit-invalid");

        uint256 miner = getConversionAmount(eth);

        _asyncTransfer(owner, eth);

        _issuance.issue(_msgSender(), miner);

        emit Converted(_msgSender(), address(_issuance), eth, miner);
    }

    event Converted(
        address recipient,
        address sender,
        uint256 sent,
        uint256 received
    );
}
