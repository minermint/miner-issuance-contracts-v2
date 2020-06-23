pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

enum TradeType { Buy, Sell }

struct Transaction {
    address recipient;
    TradeType trade;
    uint256 quantity;
    uint256 unitPrice;
    string currencyCode;
    uint256 timeStamp;
}

contract Issuance is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    IERC20 private _token;

    Transaction[] public history;

    constructor(IERC20 token) public {
        _token = token;
    }

    /**
     * Gets the number of history entries.
     * @return uint256 The number of history entries.
     */
    function getHistoryCount() public view returns (uint256) {
        return history.length;
    }

    /**
     * Issue miner tokens on a user's behalf.
     * @param recipient address The address of the token recipient.
     * @param amount uint256 The amount of Miner tokens ot purchase.
     * @param unitPrice unit256 The price, in USD, paid for each Miner token.
     * @param currencyCode string The currency code.
     */
    function issue(
        address recipient,
        uint256 amount,
        uint256 unitPrice,
        string memory currencyCode
    ) public onlyOwner() {
        require(recipient != address(0), "Issuance/address-invalid");
        require(amount > 0, "Issuance/amount-invalid");
        require(
            _token.balanceOf(address(this)) >= amount,
            "Issuance/balance-exceeded"
        );

        history.push(
            Transaction(
                recipient,
                TradeType.Sell,
                amount,
                unitPrice,
                currencyCode,
                now
            )
        );

        _token.transfer(recipient, amount);

        emit Issued(recipient, amount, unitPrice, currencyCode);
    }

    event Issued(
        address recipient,
        uint256 amount,
        uint256 unitPrice,
        string currencyCode
    );
}
