// SPDX-License-Identifier: GPL-3.0-only

pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./IMinerOracle.sol";

struct ExchangeRate {
    uint256 rate;
    uint256 blockNumber;
}

abstract contract MinerOracle is AccessControl, Ownable, IMinerOracle {
    using SafeMath for uint256;

    string public currencyCode;

    ExchangeRate[] public exchangeRates;

    bytes32 public constant ADMIN = keccak256("ADMIN");

    constructor() {
        _setRoleAdmin(ADMIN, ADMIN); // admins can manage their own accounts.
        _setupRole(ADMIN, _msgSender()); // add contract creator to admin.
    }

    /**
     * Sets the exchange rate.
     * @param rate uint256 The new exchange rate.
     */
    function setExchangeRate(uint256 rate) external override adminOnly {
        ExchangeRate memory xRate = ExchangeRate(rate, block.number);

        exchangeRates.push(xRate);
    }

    /**
     * Gets the exchange rate.
     * @return uint256 The exchange rate.
     */
    function getExchangeRate(uint256 index)
        external
        view
        override
        returns (uint256, uint256)
    {
        ExchangeRate memory xRate = _getExchangeRate(index);

        return (xRate.rate, xRate.blockNumber);
    }

    function _getExchangeRate(uint256 index)
        private
        view
        returns (ExchangeRate memory)
    {
        ExchangeRate memory xRate = exchangeRates[index];

        return xRate;
    }

    /**
     * Gets the latest exchange rate.
     * @return uint256 The latest exchange rate. Includes the rate and latest exchange rate block number.
     */
    function getLatestExchangeRate()
        external
        view
        override
        returns (uint256, uint256)
    {
        ExchangeRate memory latestExchangeRate = _getLatestExchangeRate();

        return (latestExchangeRate.rate, latestExchangeRate.blockNumber);
    }

    function _getLatestExchangeRate()
        private
        view
        returns (ExchangeRate memory)
    {
        uint256 index = exchangeRates.length.sub(1);

        return _getExchangeRate(index);
    }

    function transferOwnership(address newOwner)
        public
        virtual
        override
        onlyOwner
    {
        grantRole(ADMIN, newOwner);
        super.transferOwnership(newOwner);
    }

    modifier adminOnly() {
        require(hasRole(ADMIN, msg.sender), "MinerOracle/no-admin-privileges");
        _;
    }
}
