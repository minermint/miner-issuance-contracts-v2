// SPDX-License-Identifier: GPL-3.0-only

pragma solidity >=0.6.2 <0.8.0;

import "@chainlink/contracts/src/v0.6/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/payment/PullPayment.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2ERC20.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

import "./oracles/IMinerOracle.sol";
import "./Issuance.sol";

contract MinerSwap is PullPayment, Ownable {
    using SafeMath for uint256;

    AggregatorV3Interface public priceFeedOracle;

    IMinerOracle public minerOracle;

    Issuance public issuance;

    address public uniswapRouter;

    constructor(
        IMinerOracle minerOracleAddress,
        Issuance issuanceAddress,
        address uniswapRouterAddress) public
    {
        _setMinerOracle(minerOracleAddress);
        _setIssuance(issuanceAddress);
        _setUniswapRouterAddress(uniswapRouterAddress);
    }

    function setMinerOracle(IMinerOracle minerOracleAddress) public onlyOwner {
         _setMinerOracle(minerOracleAddress);
    }

    function setIssuance(Issuance issuanceAddress) public onlyOwner {
        _setIssuance(issuanceAddress);
    }

    function setPriceFeedOracle(AggregatorV3Interface priceFeedOracleAddress) public onlyOwner {
        priceFeedOracle = priceFeedOracleAddress;
    }

    function _setMinerOracle(IMinerOracle minerOracleAddress) private {
         minerOracle = minerOracleAddress;
    }

    function _setIssuance(Issuance issuanceAddress) private {
        issuance = issuanceAddress;
    }

    function _setUniswapRouterAddress(address uniswapRouterAddress) private {
        uniswapRouter = uniswapRouterAddress;
    }

    function getEthToMinerUnitPrice() external view returns (uint256) {
        return _getEthToMinerUnitPrice();
    }

    function _getEthToMinerUnitPrice() internal view priceFeedSet returns (uint256) {
        ( uint256 rate, ) = minerOracle.getLatestExchangeRate();

        ( , int256 answer, , , ) = priceFeedOracle.latestRoundData();

        // latest per miner price * by 18 dp, divide by latest price per eth.
        // the result will be the miner price in wei.
        return rate.mul(1e18).div(uint(answer));
    }

    function getEthToMiner(uint256 amount) external view returns (uint256) {
        return _getEthToMiner(amount);
    }

    function _getEthToMiner(uint256 amount) internal view returns (uint256) {
        uint256 xRate = _getEthToMinerUnitPrice();

        // multiply sent eth by 10^18 so that it transfers the correct amount of
        // miner.
        return amount.mul(1e18).div(xRate);
    }

    function getTokenToEth(address token, uint256 amount)
        public
        view
        returns (uint256)
    {
        IUniswapV2Router02 router = IUniswapV2Router02(uniswapRouter);
        IUniswapV2ERC20 erc20 = IUniswapV2ERC20(token);

        address[] memory path = new address[](2);
        path[0] = address(erc20);
        path[1] = router.WETH();

        return router.getAmountsOut(amount, path)[path.length - 1];
    }

    function getEthToToken(address token, uint256 amount)
        external
        view
        returns (uint256)
    {
        IUniswapV2Router02 router = IUniswapV2Router02(uniswapRouter);
        IUniswapV2ERC20 erc20 = IUniswapV2ERC20(token);

        address[] memory path = new address[](2);
        path[0] = router.WETH();
        path[1] = address(erc20);

        return router.getAmountsOut(amount, path)[path.length - 1];
    }

    function getTokenToMiner(address token, uint256 amount)
        external
        view
        returns (uint256)
    {
        uint256 tokenToEth = getTokenToEth(token, amount);

        return _getEthToMiner(tokenToEth);
    }

    function convertEthToMiner(uint256 minerMin, uint256 deadline) external payable {
        require(deadline >= block.timestamp, 'MinerSwap/deadline-expired');

        uint256 eth = msg.value;

        require(eth > 0, "MinerSwap/deposit-invalid");

        uint256 minerOut = _getEthToMiner(eth);

        require(minerOut >= minerMin, 'MinerSwap/slippage');

        _asyncTransfer(owner(), eth);

        issuance.issue(_msgSender(), minerOut);

        emit ConvertedEthToMiner(
            _msgSender(),
            address(issuance),
            eth,
            minerOut
        );
    }

    function convertTokenToMiner(
        address token,
        uint256 amount,
        uint256 minerMin,
        uint256 deadline
    ) external {
        IUniswapV2ERC20 erc20 = IUniswapV2ERC20(token);

        erc20.transferFrom(msg.sender, address(this), amount);

        erc20.approve(uniswapRouter, amount);

        IUniswapV2Router02 router = IUniswapV2Router02(uniswapRouter);

        address[] memory path = new address[](2);
        path[0] = address(erc20);
        path[1] = router.WETH();
        uint256 etherMin = getTokenToEth(token, amount);

        require(
            _getEthToMiner(etherMin) >= minerMin,
            "MinerSwap/slippage"
        );

        uint256 balanceBefore = payments(owner());

        uint256[] memory amounts = router.swapExactTokensForETH(
            amount,
            etherMin,
            path,
            address(this),
            deadline
        );

        uint256 balanceAfter = payments(owner());

        require(
            balanceAfter == balanceBefore.add(amounts[amounts.length - 1]),
            "MinerSwap/invalid-eth-amount-transferred"
        );

        uint256 minerOut = _getEthToMiner(amounts[amounts.length - 1]);

        issuance.issue(_msgSender(), minerOut);

        emit ConvertedTokenToMiner(
            _msgSender(),
            address(issuance),
            token,
            amount,
            minerOut,
            amounts[amounts.length - 1]
        );
    }

    receive() external payable {
        _asyncTransfer(owner(), msg.value);
    }

    modifier priceFeedSet() {
        require(
            address(priceFeedOracle) != address(0),
            "MinerSwap/no-oracle-set"
        );
        _;
    }

    event ConvertedEthToMiner(
        address indexed recipient,
        address indexed sender,
        uint256 amountIn,
        uint256 amountOut
    );

    event ConvertedTokenToMiner(
        address indexed recipient,
        address indexed sender,
        address indexed token,
        uint256 amountIn,
        uint256 amountOut,
        uint256 ethAmount
    );
}
