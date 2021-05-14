pragma solidity >=0.6.2 <0.8.0;

import "@openzeppelin/contracts/math/SafeMath.sol";

contract UniswapV2Router02Mock {
    using SafeMath for uint256;

    address weth;

    constructor(address factory) public {
        weth = factory;
    }

    function swapExactTokensForETH(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address payable to,
        uint deadline)
        external
        payable
        returns (uint[] memory amounts)
    {
        require(deadline >= block.timestamp, "UniswapV2Router: EXPIRED");
        require(path[1] == _WETH());

        amounts = getAmountsOut(amountIn, path);

        uint256 amountOut = amounts[amounts.length - 1];

        require(amountOut >= amountOutMin, "UniswapV2Router: INSUFFICIENT_OUTPUT_AMOUNT");

        (bool success, ) = to.call{value: amountOut}("");
        require(success, "Transfer failed.");

        return amounts;
    }

    function WETH() external view returns (address) {
        return _WETH();
    }

    function _WETH() internal view returns (address) {
        return weth;
    }

    /*
     * Gets the amount out. This will default to 1 dai = 0.001 eth.
     */
    function getAmountsOut(uint256 amountIn, address[] memory path)
        public view returns (uint256[] memory amounts)
    {
        uint256 amountOut = 0;

        amounts = new uint[](path.length);

        if (path[0] == _WETH()) {
            amountOut = amountIn.mul(1e18).div(1e15);
        } else {
            amountOut = amountIn.mul(1e15).div(1e18);
        }

        amounts[0] = amountIn;
        amounts[1] = amountOut;
    }

    receive() external payable {

    }
}
