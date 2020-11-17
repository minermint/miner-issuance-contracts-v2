// SPDX-License-Identifier: GPL-3.0-only

pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract Issuance is AccessControl, Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    IERC20 private _token;

    bytes32 public constant ADMIN = keccak256("ADMIN");
    bytes32 public constant ISSUER = keccak256("ISSUER");

    constructor(IERC20 token) public {
        _token = token;

        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setRoleAdmin(DEFAULT_ADMIN_ROLE, ADMIN);
    }

    function addIssuer(address issuer) public {
        grantRole(ISSUER, issuer);
    }

    function removeIssuer(address issuer) public {
        revokeRole(ISSUER, issuer);
    }

    /**
     * Issue miner tokens on a user's behalf.
     * @param recipient address The address of the token recipient.
     * @param amount uint256 The amount of Miner tokens to purchase.
     */
    function issue(
        address recipient,
        uint256 amount
    ) public onlyIssuer {
        require(recipient != address(0), "Issuance/address-invalid");
        require(amount > 0, "Issuance/amount-invalid");
        require(
            _token.balanceOf(address(this)) >= amount,
            "Issuance/balance-exceeded"
        );

        _token.transfer(recipient, amount);

        emit Issued(recipient, amount);
    }

    modifier onlyIssuer()
    {
        require(hasRole(ISSUER, _msgSender()), "Issuance/no-issuer-privileges");
        _;
    }

    event Issued(
        address indexed recipient,
        uint256 amount
    );
}
