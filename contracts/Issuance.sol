// SPDX-License-Identifier: GPL-3.0-only

pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/payment/PullPayment.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@chainlink/contracts/src/v0.6/interfaces/AggregatorV3Interface.sol";

import "./IMinerOracle.sol";

struct Swap {
    IERC20 token;
    AggregatorV3Interface priceFeedOracle;
    bool enabled;
}

contract Issuance is Ownable, PullPayment {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    IERC20 private _miner;
    IMinerOracle private _minerOracle;
    AggregatorV3Interface private _ethPriceFeedOracle;

    mapping (address => Swap) swaps;

    constructor(IERC20 miner) public {
        _miner = miner;
    }

    function setMinerOracle(IMinerOracle minerOracle) public onlyOwner {
         _minerOracle = minerOracle;
    }

    function setEthPriceFeedOracle(AggregatorV3Interface priceFeedOracle) public onlyOwner {
        _ethPriceFeedOracle = priceFeedOracle;
    }

    function registerSwap(AggregatorV3Interface priceFeedOracle, IERC20 token) external returns (uint256) onlyOwner {
        swapMap[token] = swap;
    }

    function getConversionRate() external view returns (uint256) {
        return _getConversionRate();
    }

    function _getConversionRate(IERC20 token) internal view returns (uint256) {
        ( , uint256 rate, ) = _minerOracle.getLatestExchangeRate();

        ( , int256 answer, , , ) = _ethPriceFeedOracle.latestRoundData();

        // latest per miner price * by 18 dp, divide by latest price per eth.
        return rate.mul(1e18).div(uint(answer));
    }

    function convert(uint256 amount, IERC20 token) public view returns (uint256) {
        uint256 conversionRate = _getConversionRate();

        // multiply sent eth by 10^18 so that it transfers the correct amount of
        // miner.
        return amount.mul(1e18).div(conversionRate);
    }

    function issue(uint amount, IERC20 token) external {
        require(amount > 0, "Issuance/zero-amount");

        emit Issued(_msgSender(), amount, 100);
    }

    function issue() external payable {
        require(swaps.length > 0, "Issuance/no-pairs");

        Swap memory swap = swaps[0];

        address owner = owner();
        uint256 eth = msg.value;
        uint256 miner = convert(eth);

        require(eth > 0, "Issuance/deposit-invalid");

        require(
            _miner.balanceOf(address(this)) >= miner,
            "Issuance/balance-exceeded"
        );

        _asyncTransfer(owner, eth);

        _miner.transfer(_msgSender(), miner);

        emit Issued(_msgSender(), eth, miner);
    }

    function withdraw(IERC20 token) external onlyOwner {
        address owner = owner();
    }

    function withdraw() external onlyOwner {
        address owner = owner();

        //withdrawPaymentsWithGas(owner());
    }

    event Issued(
        address indexed recipient,
        uint256 received,
        uint256 sent
    );
}
