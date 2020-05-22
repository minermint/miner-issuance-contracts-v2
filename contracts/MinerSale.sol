pragma solidity ^0.6.0;

import "./Miner.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract MinerSale is Ownable {
    using SafeMath for uint;
    using SafeERC20 for Miner;

    enum TradeType { Buy, Sell }

    struct Transaction {
        address who;
        TradeType trade;
        uint256 quantity;
        uint256 unitPrice;
        uint256 ethPrice;
        uint256 timeStamp;
    }

    Miner private _token;

    mapping (address => uint256[]) private _tradesByAccount;

    Transaction[] public history;

    constructor(Miner token) public {
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
     * Purchases miner tokens on a user's behalf.
     * @param to address The address of the token recipient.
     * @param amount uint256 The amount of Miner tokens ot purchase.
     * @param unitPrice unit256 The price, in USD, paid for each Miner token.
     * @param ethPrice unit256 The price, in Ether, paid for each Miner token.
     */
    function purchase(address to, uint256 amount, uint256 unitPrice, uint256 ethPrice) public onlyOwner() {
        require(to != address(0), "Invalid address");
        require(amount > 0, "Amount must be greater than zero");
        require(_token.balanceOf(address(this)) >= amount, "Amount purchased is less than balance available");

        history.push(Transaction(to, TradeType.Sell, amount, unitPrice, ethPrice, now));
        _tradesByAccount[to].push(history.length);
        _token.transfer(to, amount);
    }
}
