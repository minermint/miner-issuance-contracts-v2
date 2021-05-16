pragma solidity >=0.6.2 <0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract DaiMock is ERC20, Ownable {
    constructor() public ERC20("Dai", "DAI") {
        _mint(owner(), uint256(1000000).mul(1e18));
    }
}
