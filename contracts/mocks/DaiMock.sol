pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract DaiMock is ERC20, Ownable {
    using SafeMath for uint256;

    constructor() ERC20("Dai", "DAI") {
        _mint(owner(), uint256(1000000).mul(1e18));
    }
}
