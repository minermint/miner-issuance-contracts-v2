pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

enum TradeType { Buy, Sell }

struct Transaction {
    address who;
    TradeType trade;
    uint256 quantity;
    uint256 unitPrice;
    string currencyCode;
    uint256 timeStamp;
}

contract Issuance is Ownable {
    using SafeMath for uint;
    using SafeERC20 for IERC20;

    IERC20 private _token;

    mapping (address => uint256[]) private _tradesByAccount;

    Transaction[] public history;

    constructor(IERC20 token) public {
        _token = token;
    }

    function getHistoryCount() public view returns (uint256) {
        return history.length;
    }

    function getAccountTradesCount(address who) public view returns (uint256) {
        return _tradesByAccount[who].length;
    }

    function getAccountTradesIndexes(address who) public view returns (uint256[] memory) {
        return _tradesByAccount[who];
    }

    /**
     * Issue miner tokens on a user's behalf.
     * @param to address The address of the token recipient.
     * @param amount uint256 The amount of Miner tokens ot purchase.
     * @param unitPrice unit256 The price, in USD, paid for each Miner token.
     * @param currencyCode string The currency code.
     */
    function issue(address to, uint256 amount, uint256 unitPrice, string memory currencyCode) public onlyOwner() {
        require(to != address(0), "Issuance/address-invalid");
        require(amount > 0, "Issuance/amount-invalid");
        require(_token.balanceOf(address(this)) >= amount, "Issuance/balance-exceeded");

        history.push(Transaction(to, TradeType.Sell, amount, unitPrice, currencyCode, now));
        _tradesByAccount[to].push(history.length);
        _token.transfer(to, amount);
    }
}
