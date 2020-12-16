// SPDX-License-Identifier: GPL-3.0-only

pragma solidity ^0.6.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@chainlink/contracts/src/v0.6/interfaces/AggregatorV3Interface.sol";

import "./MinerSwap.sol";

struct Swap {
    IERC20 token;
    AggregatorV3Interface priceFeedOracle;
    bool enabled;
}

contract TokenSwap is MinerSwap {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    address[] public swapAddresses;
    mapping (address => Swap) public swaps;

    constructor(
        IMinerOracle minerOracleAddress,
        Issuance issuanceAddress
    )
    MinerSwap(minerOracleAddress, issuanceAddress) public {
    }

    function registerSwap(AggregatorV3Interface priceFeedOracle, IERC20 token) external onlyAdmin {
        Swap memory swap = Swap(token, priceFeedOracle, true);
        swapAddresses.push(address(token));
        swaps[address(token)] = swap;
    }

    function deregisterSwap(IERC20 token) external onlyAdmin {
        swaps[address(token)].enabled = false;
    }

    function getSwapAddressCount() external view returns (uint256) {
        return swapAddresses.length;
    }

    function getConversionRate(IERC20 token) external view returns (uint256) {
        return _getConversionRate(token);
    }

    function _getConversionRate(IERC20 token) internal view returns (uint256) {
        ( uint256 rate, ) = minerOracle.getLatestExchangeRate();

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

        issuance.issue(_msgSender(), miner);

        emit Converted(_msgSender(), address(issuance), amount, miner);
    }

    event Converted(
        address indexed recipient,
        address indexed sender,
        uint256 sent,
        uint256 received
    );
}
