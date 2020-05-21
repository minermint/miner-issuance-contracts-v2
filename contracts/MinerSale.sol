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

    mapping (address => uint256) private _balances;
    mapping (address => uint256) private _tradeCount;

    Transaction[] public history;

    constructor(Miner token) public {
        _token = token;
    }

    function getTotalTradeCount() public view returns (uint256) {
        return history.length;
    }

    function getAccountTradeCount(address who) public view returns (uint256) {
        return _tradeCount[who];
    }

    function getAccountTradesIndexes(address who) public view returns (uint256[] memory indexes) {
        uint256 j = 0;
        uint256 count = getAccountTradeCount(who);
        indexes = new uint256[](count);

        for (uint256 i; i < history.length; i++) {
            if (history[i].who == who) {
                 indexes[j] = i;
                 j++;
            }
        }

        return indexes;
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
        require(_balances[address(this)] >= amount, "Can not buy more than the contract has");

        history.push(Transaction(to, TradeType.Sell, amount, unitPrice, ethPrice, now));
        _tradeCount[to] = _tradeCount[to].add(1);
        _token.transfer(to, value);
    }
}
