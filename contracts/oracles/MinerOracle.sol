// SPDX-License-Identifier: GPL-3.0-only

pragma solidity ^0.6.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./IMinerOracle.sol";

struct ExchangeRate {
    uint256 rate;
    uint256 blockNumber;
}

abstract contract MinerOracle is AccessControl, Ownable, IMinerOracle {
    using SafeMath for uint256;

    string currencyCode;

    ExchangeRate[] public exchangeRates;

    bytes32 public constant ADMIN = keccak256("ADMIN");

    constructor() public {
        _setRoleAdmin(ADMIN, ADMIN); // admins can manage their own accounts.
        _setupRole(ADMIN, _msgSender()); // add contract creator to admin.
    }

    function setExchangeRate(uint rate) override external adminOnly {
        ExchangeRate memory xRate = ExchangeRate(rate, block.number);

        exchangeRates.push(xRate);
    }

    function getExchangeRate(uint index) override external view returns (uint, uint) {
        ExchangeRate memory xRate = _getExchangeRate(index);

        return (xRate.rate, xRate.blockNumber);
    }

    function _getExchangeRate(uint index) private view returns (ExchangeRate memory) {
        ExchangeRate memory xRate = exchangeRates[index];

        return xRate;
    }

    function getLatestExchangeRate() override external view returns (uint, uint) {
        ExchangeRate memory latestExchangeRate = _getLatestExchangeRate();

        return
        (
            latestExchangeRate.rate,
            latestExchangeRate.blockNumber
        );
    }

    function _getLatestExchangeRate() private view returns (ExchangeRate memory) {
        uint index = exchangeRates.length.sub(1);

        return _getExchangeRate(index);
    }

    function transferOwnership(address newOwner) public virtual override onlyOwner {
        grantRole(ADMIN, newOwner);
        super.transferOwnership(newOwner);
    }

    modifier adminOnly()
    {
        require(
            hasRole(ADMIN, msg.sender),
            "MinerOracle/no-admin-privileges");
        _;
    }
}
