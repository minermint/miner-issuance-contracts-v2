pragma solidity ^0.6.0;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./IMinerOracle.sol";

struct ExchangeRate {
    string currencyCode;
    uint256 rate;
    uint256 blockNumber;
}

contract MinerOracle is AccessControl, IMinerOracle {
    using SafeMath for uint256;

    bytes32 public constant ADMIN = keccak256("ADMIN");
    bytes32 public constant WRITE = keccak256("WRITE");

    ExchangeRate[] public exchangeRates;

    constructor() public {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setRoleAdmin(DEFAULT_ADMIN_ROLE, ADMIN);
        _setupRole(WRITE, _msgSender());
    }

    function setExchangeRate(string calldata currencyCode, uint rate) override external writeOnly {
        ExchangeRate memory xRate = ExchangeRate(currencyCode, rate, block.number);

        exchangeRates.push(xRate);
    }

    function getExchangeRate(uint index) override external view returns (string memory, uint, uint) {
        ExchangeRate memory xRate = _getExchangeRate(index);

        return (xRate.currencyCode, xRate.rate, xRate.blockNumber);
    }

    function _getExchangeRate(uint index) private view returns (ExchangeRate memory) {
        ExchangeRate memory xRate = exchangeRates[index];

        return xRate;
    }

    function getLatestExchangeRate() override external view returns (string memory, uint, uint) {
        ExchangeRate memory latestExchangeRate = _getLatestExchangeRate();

        return
        (
            latestExchangeRate.currencyCode,
            latestExchangeRate.rate,
            latestExchangeRate.blockNumber
        );
    }

    function _getLatestExchangeRate() private view returns (ExchangeRate memory) {
        uint index = exchangeRates.length.sub(1);

        return _getExchangeRate(index);
    }

    modifier writeOnly()
    {
        require(hasRole(WRITE, msg.sender), "MinerOracle/no-write-privileges");
        _;
    }
}
