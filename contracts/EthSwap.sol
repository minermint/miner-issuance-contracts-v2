// SPDX-License-Identifier: GPL-3.0-only

pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/payment/PullPayment.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@chainlink/contracts/src/v0.6/interfaces/AggregatorV3Interface.sol";

import "./MinerSwap.sol";

contract EthSwap is MinerSwap, PullPayment {
    using SafeMath for uint256;

    AggregatorV3Interface private priceFeedOracle;

    constructor(
        IMinerOracle minerOracleAddress,
        AggregatorV3Interface priceFeedOracleAddress,
        Issuance issuanceAddress
    )
    MinerSwap(minerOracleAddress, issuanceAddress) public {
        setPriceFeedOracle(priceFeedOracleAddress);
    }

    function setPriceFeedOracle(AggregatorV3Interface priceFeedOracleAddress) public onlyOwner {
        priceFeedOracle = priceFeedOracleAddress;
    }

    function getConversionRate() external view returns (uint256) {
        return _getConversionRate();
    }

    function _getConversionRate() internal view returns (uint256) {
        ( uint256 rate, ) = minerOracle.getLatestExchangeRate();

        ( , int256 answer, , , ) = priceFeedOracle.latestRoundData();

        // latest per miner price * by 18 dp, divide by latest price per eth.
        return rate.mul(1e18).div(uint(answer));
    }

    function getConversionAmount(uint256 amount) public view returns (uint256) {
        uint256 conversionRate = _getConversionRate();

        // multiply sent eth by 10^18 so that it transfers the correct amount of
        // miner.
        return amount.mul(1e18).div(conversionRate);
    }

    function convert(uint256 minerMin) external payable {
        address owner = owner();
        uint256 eth = msg.value;

        require(eth > 0, "EthSwap/deposit-invalid");

        uint256 miner = getConversionAmount(eth);

        require(miner >= minerMin, 'EthSwap/slippage');

        _asyncTransfer(owner, eth);

        issuance.issue(_msgSender(), miner);

        emit Converted(_msgSender(), address(issuance), eth, miner);
    }

    event Converted(
        address indexed recipient,
        address indexed sender,
        uint256 sent,
        uint256 received
    );
}
