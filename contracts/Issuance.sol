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

    IERC20 private _token;

    IMinerOracle private _minerOracle;

    constructor(IERC20 token) public {
        _token = token;
    }

    function setMinerOracle(IMinerOracle minerOracle) public {
         _minerOracle = minerOracle;
    }

    /**
     * Issue miner tokens on a user's behalf.
     * @param recipient address The address of the token recipient.
     */
    function issue(address recipient) external payable {
        require(recipient != address(0), "Issuance/address-invalid");
        require(msg.value > 0, "Issuance/deposit-invalid");

        uint256 minerEthUnitPrice = _minerOracle.getLatestMinerEth();

        // multiply sent eth by 10^18 so that it transfers the correct amount of
        // miner.
        uint256 amount = msg.value.mul(1e18).div(minerEthUnitPrice);

        require(
            _token.balanceOf(address(this)) >= amount,
            "Issuance/balance-exceeded"
        );

        address owner = owner();

        _asyncTransfer(owner, msg.value);

        _token.transfer(recipient, amount);

        emit Issued(recipient, msg.value, amount);
    }

    event Issued(
        address indexed recipient,
        uint256 received,
        uint256 sent
    );
}
