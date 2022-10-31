// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.2 <0.9.0;

import "../MinerIssuance.sol";
import "hardhat/console.sol";

/// @title Issue Miner for Ether and other ERC20 tokens.
contract SenderMock {
    address payable public issuance;

    constructor(address payable issuance_) {
        issuance = issuance_;
    }

    fallback() external payable {
        if (msg.sender == issuance) {
            // It doesn't seem possible to capture the re-entrancy revert msg.
            // Instead the upstream "call" will return success = false.
            MinerIssuance(issuance).issueExactMinerForETH{ value: 1 ether }(
                uint256(1),
                uint256(1)
            );
        }
    }
}
