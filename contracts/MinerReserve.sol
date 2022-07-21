// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract MinerReserve is AccessControl {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    IERC20 private _token;

    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");

    constructor(IERC20 token) {
        _token = token;

        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(ISSUER_ROLE, _msgSender());
    }

    /**
     * Issue miner tokens on a user's behalf.
     * @param recipient address The address of the token recipient.
     * @param amount uint256 The amount of Miner tokens to purchase.
     */
    function issue(address recipient, uint256 amount)
        external
        onlyRole(ISSUER_ROLE)
    {
        require(amount > 0, "MinerReserve/amount-invalid");
        require(
            _token.balanceOf(address(this)) >= amount,
            "MinerReserve/balance-exceeded"
        );

        _token.transfer(recipient, amount);

        emit Issued(recipient, amount);
    }

    event Issued(address indexed recipient, uint256 amount);
}
