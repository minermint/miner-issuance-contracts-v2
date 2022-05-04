// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Miner is ERC20, Ownable {
    address private _minter;

    constructor() public ERC20("Miner", "MINER") Ownable() {
        // explicitly require a minter to be created.
        _minter = address(0);
    }

    /**
     * Sets the minter address.
     * @param minter address The minter address.
     */
    function setMinter(address minter) public onlyOwner {
        require(minter != address(0), "Miner/zero-address");
        _minter = minter;
    }

    /**
     * Gets the minter address.
     * @return address The minter address.
     */
    function getMinter() public view returns (address) {
        return _minter;
    }

    function mint(uint256 amount) public onlyMinter {
        _mint(_msgSender(), amount);
    }

    /**
     * Checks that the minter is assigned and is the calling user.
     * If msg.sender does not match the minter, the test blows the gas limit
     * out. Not sure why it doesn't revert on the require.
     */
    modifier onlyMinter {
        require(getMinter() == _msgSender(), "Miner/invalid-minter");
        _;
    }
}
