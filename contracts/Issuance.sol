// SPDX-License-Identifier: GPL-3.0-only

pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/payment/PullPayment.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@chainlink/contracts/src/v0.6/interfaces/AggregatorV3Interface.sol";
import "./IMinerOracle.sol";

contract Issuance is Ownable, PullPayment {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    IERC20 private _miner;
    IMinerOracle private _minerOracle;
    AggregatorV3Interface private _priceFeedOracle;

    constructor(IERC20 miner) public {
        _miner = miner;
    }

    function setMinerOracle(IMinerOracle minerOracle) public onlyOwner() {
         _minerOracle = minerOracle;
    }

    function setPriceFeedOracle(AggregatorV3Interface priceFeedOracle) public onlyOwner {
        _priceFeedOracle = priceFeedOracle;
    }

    function getConversionRate() public view returns (uint256) {
        (
            string memory currency,
            uint256 rate,
            uint256 blockNumber
        ) = _minerOracle.getLatestExchangeRate();

        (
            uint80 roundID,
            int256 answer,
            uint256 startedAt,
            uint256 timeStamp,
            uint80 answeredInRound
        ) = _priceFeedOracle.latestRoundData();

        // latest per miner price * by 18 dp, divide by latest price per eth.
        return rate.mul(1e18).div(uint(answer));
    }

    function convert(uint256 amount) public view returns (uint256) {
        uint256 conversionRate = getConversionRate();

        // multiply sent eth by 10^18 so that it transfers the correct amount of
        // miner.
        return amount.mul(1e18).div(conversionRate);
    }

    /**
     * Issue miner tokens on a user's behalf.
     */
    function issue() external payable {
        address owner = owner();
        uint256 eth = msg.value;

        require(eth > 0, "Issuance/deposit-invalid");

        uint256 miner = convert(eth);

        require(
            _miner.balanceOf(address(this)) >= miner,
            "Issuance/balance-exceeded"
        );

        _asyncTransfer(owner, eth);

        _miner.transfer(_msgSender(), miner);

        emit Issued(_msgSender(), eth, miner);
    }

    event Issuing(
        uint eth,
        uint miner,
        uint rate
    );

    event Issued(
        address indexed recipient,
        uint256 received,
        uint256 sent
    );
}
