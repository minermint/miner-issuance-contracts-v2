// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.2 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract MinerReserve is AccessControl {
    using SafeERC20 for IERC20;

    address private _token;

    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");

    constructor(address token) {
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
        require(amount > 0, "Reserve/amount-invalid");
        require(
            IERC20(_token).balanceOf(address(this)) >= amount,
            "Reserve/balance-exceeded"
        );

        IERC20(_token).safeTransfer(recipient, amount);

        emit Issued(recipient, amount);
    }

    event Issued(address indexed recipient, uint256 amount);
}
