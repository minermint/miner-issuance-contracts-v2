// SPDX-License-Identifier: GPL-3.0-only

pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestToken is ERC20 {
    uint8 private constant DECIMALS = 18;

    constructor() public ERC20("TestToken", "TEST") {
        _mint(_msgSender(), 1000000e18);
        _setupDecimals(DECIMALS);
    }
}
