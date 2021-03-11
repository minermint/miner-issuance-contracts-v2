// SPDX-License-Identifier: GPL-3.0-only

pragma solidity >=0.6.2 <0.8.0;

import "@chainlink/contracts/src/v0.6/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

import "./oracles/IMinerOracle.sol";
import "./Issuance.sol";

abstract contract MinerSwap is AccessControl, Ownable {
    IMinerOracle public minerOracle;

    Issuance public issuance;

    bytes32 public constant ADMIN = keccak256("ADMIN");

    constructor(
        IMinerOracle minerOracleAddress,
        Issuance issuanceAddress) public
    {
        _setRoleAdmin(ADMIN, ADMIN); // admins can manage their own accounts.
        _setupRole(ADMIN, _msgSender()); // add contract creator to admin.

        setMinerOracle(minerOracleAddress);
        setIssuance(issuanceAddress);
    }

    function setMinerOracle(IMinerOracle minerOracleAddress) public onlyAdmin {
         minerOracle = minerOracleAddress;
    }

    function setIssuance(Issuance issuanceAddress) public onlyAdmin {
        issuance = issuanceAddress;
    }

    function transferOwnership(address newOwner) public virtual override onlyOwner {
        grantRole(ADMIN, newOwner);
        super.transferOwnership(newOwner);
    }

    modifier onlyAdmin()
    {
        require(hasRole(ADMIN, _msgSender()), "Issuance/no-admin-privileges");
        _;
    }
}
