// SPDX-License-Identifier: GPL-3.0-only

pragma solidity >=0.6.2 <0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@chainlink/contracts/src/v0.6/interfaces/AggregatorV3Interface.sol";

import "./MinerSwap.sol";

struct Swap {
    IERC20 token;
    AggregatorV3Interface priceFeedOracle;
    bool enabled;
    uint256 escrowed;
}

contract TokenSwap is MinerSwap {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    address[] public tokens;
    mapping (address => Swap) public swaps;

    constructor(
        IMinerOracle minerOracleAddress,
        Issuance issuanceAddress
    )
    MinerSwap(minerOracleAddress, issuanceAddress) public {
    }

    function registerSwap(IERC20 token, AggregatorV3Interface priceFeedOracle) external onlyAdmin {
        require(
            swaps[address(token)].token != token,
            "TokenSwap/token-already-registered"
        );

        tokens.push(address(token));

        Swap memory swap = Swap(token, priceFeedOracle, true, 0);
        swaps[address(token)] = swap;
    }

    function updateSwap(IERC20 token, AggregatorV3Interface priceFeedOracle) external onlyAdmin {
        require(
            swaps[address(token)].token == token,
            "TokenSwap/token-not-registered");

        Swap storage swap = swaps[address(token)];
        swap.priceFeedOracle = priceFeedOracle;
    }

    function deregisterSwap(IERC20 token) external onlyAdmin {
        swaps[address(token)].enabled = false;
    }

    function getSwapAddressCount() external view returns (uint256) {
        return tokens.length;
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
        require(amount > 0, "TokenSwap/deposit-invalid");

        uint256 miner = getConversionAmount(token, amount);

        require(miner >= minerMin, 'EthSwap/slippage');

        _deposit(amount, token);

        issuance.issue(_msgSender(), miner);

        emit Converted(_msgSender(), address(issuance), amount, miner);
    }

    function _deposit(uint256 amount, IERC20 token) private {
        Swap storage swap = swaps[address(token)];

        token.transferFrom(_msgSender(), address(this), amount);
        swap.escrowed = swap.escrowed.add(amount);
    }

    function withdraw(IERC20 token) public onlyOwner {
        Swap storage swap = swaps[address(token)];
        address owner = owner();
        uint256 balance = swap.escrowed;

        swap.escrowed = 0;
        token.transfer(owner, balance);

        emit Withdrawn(owner, address(token), balance);
    }

    event Converted(
        address indexed recipient,
        address indexed sender,
        uint256 sent,
        uint256 received
    );

    event Withdrawn(
        address indexed recipient,
        address indexed token,
        uint256 amount
    );
}
