pragma solidity >=0.6.2 <0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract WETHMock is ERC20, Ownable  {
    constructor() public ERC20 ("WETH", "WETH") {
        _mint(owner(), uint256(10).mul(1e18));
    }
}
