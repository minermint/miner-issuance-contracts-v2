// SPDX-License-Identifier: GPL-3.0-only

pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@chainlink/contracts/src/v0.6/interfaces/AggregatorV3Interface.sol";

import "./IMinerOracle.sol";
import "./Issuance.sol";

struct Swap {
    IERC20 token;
    AggregatorV3Interface priceFeedOracle;
    bool enabled;
}

contract TokenSwap is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    IMinerOracle private _minerOracle;
    AggregatorV3Interface private _priceFeedOracle;
    Issuance private _issuance;

    address[] public swapAddresses;
    mapping (address => Swap) public swaps;

    constructor(IMinerOracle minerOracle, Issuance issuance) public {
        setMinerOracle(minerOracle);
        setIssuance(issuance);
    }

    function registerSwap(AggregatorV3Interface priceFeedOracle, IERC20 token) external onlyOwner {
        Swap memory swap = Swap(token, priceFeedOracle, true);
        swapAddresses.push(address(token));
        swaps[address(token)] = swap;
    }

    function deregisterSwap(IERC20 token) external onlyOwner {
        swaps[address(token)].enabled = false;
    }

    function getSwapAddressCount() external returns (uint256) {
        return swapAddresses.length;
    }

    function setMinerOracle(IMinerOracle minerOracle) public onlyOwner {
         _minerOracle = minerOracle;
    }

    function setIssuance(Issuance issuance) public onlyOwner {
        _issuance = issuance;
    }

    function getConversionRate(IERC20 token) external view returns (uint256) {
        return _getConversionRate(token);
    }

    function _getConversionRate(IERC20 token) internal view returns (uint256) {
        ( , uint256 rate, ) = _minerOracle.getLatestExchangeRate();

        Swap memory swap = swaps[address(token)];

        ( , int256 answer, , , ) = swap.priceFeedOracle.latestRoundData();

        // latest per miner price * by 18 dp, divide by latest price per eth.
        return rate.mul(1e18).div(uint(answer));
    }

    function getConversionAmount(IERC20 token, uint256 amount) public view returns (uint256) {
        uint256 conversionRate = _getConversionRate(token);

        // multiply sent eth by 10^18 so that it transfers the correct amount of
        // miner.
        return amount.mul(1e18).div(conversionRate);
    }

    function convert(IERC20 token, uint256 amount, uint256 minerMin) external {
        address owner = owner();

        require(amount > 0, "Issuance/deposit-invalid");

        uint256 miner = getConversionAmount(token, amount);

        require(miner >= minerMin, 'EthSwap/slippage');

        token.transferFrom(_msgSender(), owner, amount);

        _issuance.issue(_msgSender(), miner);

        emit Converted(_msgSender(), address(_issuance), amount, miner);
    }

    event Converted(
        address recipient,
        address sender,
        uint256 sent,
        uint256 received
    );
}
