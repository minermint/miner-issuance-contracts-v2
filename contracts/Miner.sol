pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract Miner is ERC20, Ownable {
    uint8 constant DECIMALS = 4;

    address private _minter;

    constructor()
        ERC20("Miner", "MINER")
        Ownable()
        public
    {
        _setupDecimals(DECIMALS);
    }

    /**
     * Sets the minter address.
     * @param minter address The minter address.
     */
    function setMinter(address minter) public onlyOwner {
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

    modifier onlyMinter {
        require(_msgSender() == _minter, "Not minter");
        _;
    }
}
