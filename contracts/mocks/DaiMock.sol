pragma solidity >=0.6.2 <=0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract DaiMock is ERC20, Ownable {
    using SafeMath for uint256;

    constructor() ERC20("Dai", "DAI") {
        _mint(owner(), uint256(1000000).mul(1e18));
    }
}
