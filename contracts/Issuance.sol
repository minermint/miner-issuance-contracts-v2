// SPDX-License-Identifier: GPL-3.0-only

pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/payment/PullPayment.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

import "./pairs/IMinerPair.sol";

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
    Swap[] public swaps;

    constructor(IERC20 miner) public {
        _miner = miner;
    }

    function setMinerOracle(IMinerOracle minerOracle) public onlyOwner {
         _minerOracle = minerOracle;
    }

    function setEthPriceFeedOracle(AggregatorV3Interface priceFeedOracle) public onlyOwner {
        _priceFeedOracle = priceFeedOracle;
    }

    function registerSwap(AggregatorV3Interface priceFeedOracle, IERC20 token) external returns (uint256) {
        Swap memory swap = Swap(token, priceFeedOracle, true);
        swaps.push(swap);
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

    function issue(uint amount, IERC20 token) external {
        require(amount > 0, "Issuance/zero-amount");

        emit Issued(_msgSender(), amount, 100);
    }

    function issue() external payable {
        require(swaps.length > 0, "Issuance/no-pairs");

        Swap memory swap = swaps[0];

        IMinerPair pair = swap.pair;

        address owner = owner();
        uint256 eth = msg.value;

        require(eth > 0, "Issuance/deposit-invalid");

        uint256 miner = pair.convert(eth);

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

        withdrawPaymentsWithGas(owner());
    }

    event Issued(
        address indexed recipient,
        uint256 received,
        uint256 sent
    );
}
