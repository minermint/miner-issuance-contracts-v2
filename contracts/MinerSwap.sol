// SPDX-License-Identifier: GPL-3.0-only

pragma solidity >=0.8.0 <0.9.0;

import "@chainlink/contracts/src/v0.6/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/PullPayment.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2ERC20.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/lib/contracts/libraries/TransferHelper.sol";

import "./oracles/IMinerOracle.sol";
import "./Issuance.sol";

/// @title Swap Ether and other ERC20 tokens for Miner.
/// @author hayden.y@minertoken.io
contract MinerSwap is PullPayment, Ownable {
    using SafeMath for uint256;

    AggregatorV3Interface public priceFeedOracle;

    IMinerOracle public minerOracle;

    Issuance public issuance;

    address public uniswapRouter;

    /**
     * Initializes the MinerSwap contract.
     * @param minerOracleAddress IMinerOracle The Miner oracle contract.
     * @param issuanceAddress Issuance The Issuance contract.
     * @param uniswapRouterAddress address The Uniswap Router contract.
     */
    constructor(
        IMinerOracle minerOracleAddress,
        Issuance issuanceAddress,
        address uniswapRouterAddress
    ) {
        _setMinerOracle(minerOracleAddress);
        _setIssuance(issuanceAddress);
        _setUniswapRouterAddress(uniswapRouterAddress);
    }

    /**
     * Sets the Miner oraacle contract.
     * @param minerOracleAddress IMinerOracle The Miner oracle contract.
     */
    function setMinerOracle(IMinerOracle minerOracleAddress) public onlyOwner {
        _setMinerOracle(minerOracleAddress);
    }

    /**
     * Sets the Issuance contract.
     * @param issuanceAddress Issuance The Issuance contract.
     */
    function setIssuance(Issuance issuanceAddress) public onlyOwner {
        _setIssuance(issuanceAddress);
    }

    /**
     * Sets the Price Feed contract. This will be a valid Chainlink contract. An example of available contracts are available at https://docs.chain.link/docs/ethereum-addresses/.
     * @param priceFeedOracleAddress AggregatorV3Interface The Price Feed contract.
     */
    function setPriceFeedOracle(AggregatorV3Interface priceFeedOracleAddress)
        public
        onlyOwner
    {
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

    /**
     * Calculates the price of a single Miner token in Ether. The amount will be returned in Wei, x ether * 10^18 (18 dp).
     * @return uint256 The price off a single Miner token in Ether.
     */
    function calculateEthPerMiner() external view returns (uint256) {
        return _calculateEthPerMiner();
    }

    function _calculateEthPerMiner()
        internal
        view
        priceFeedSet
        returns (uint256)
    {
        (uint256 rate, ) = minerOracle.getLatestExchangeRate();

        (, int256 answer, , , ) = priceFeedOracle.latestRoundData();

        // latest per miner price * by 18 dp, divide by latest price per eth.
        // the result will be the price of 1 miner in wei.
        return rate.mul(1e18).div(uint256(answer));
    }

    /**
     * Calculates the price of a single Miner token in the token specified by address. The token must be ERC20 compatible.
     * @param token address The address of the token being swapped for Miner. Must be a valid ERC20 compatible token.
     * @return uint256 The price of a single Miner token in the token specified by address.
     */
    function calculateTokensPerMiner(address token)
        external
        view
        returns (uint256)
    {
        return _calculateTokensPerMiner(token);
    }

    function _calculateTokensPerMiner(address token)
        internal
        view
        returns (uint256)
    {
        uint256 ethPerMiner = _calculateEthPerMiner();
        uint256 amount = calculateEthToTokenSwap(token, ethPerMiner);

        return amount;
    }

    /**
     * Calculates how much miner will be received for the amount in Ether. The amount of Ether must be in Wei, x ether * 10^18 (18 dp).
     * @param amount uint256 The amount of Ether to swap.
     * @return uint256 The amount of Miner tokens received for the specified Ether amount.
     */
    function calculateEthToMinerSwap(uint256 amount)
        external
        view
        returns (uint256)
    {
        return _calculateEthToMinerSwap(amount);
    }

    function _calculateEthToMinerSwap(uint256 amount)
        internal
        view
        returns (uint256)
    {
        uint256 xRate = _calculateEthPerMiner();

        // multiply sent eth by 10^18 so that it transfers the correct amount of
        // miner.
        return amount.mul(1e18).div(xRate);
    }

    /**
     * Calculates how much Ether will be received for the amount of token. The token must be ERC20 compatible.
     * @param token address The address of the token being swapped for. Must be a valid ERC20 compatible token.
     * @param amount uint256 The amount of token to swap.
     * @return uint256 The amount of Ether received for the specified token amount.
     */
    function calculateTokenToEthSwap(address token, uint256 amount)
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

    /**
     * Calculates how many tokens will be received for the amount of Ether. The token must be ERC20 compatible.
     * @param token address The address of the token being swapped to. Must be a valid ERC20 compatible token.
     * @param amount uint256 The amount of token to swap.
     * @return uint256 The amount of Ether received for the specified token amount.
     */
    function calculateEthToTokenSwap(address token, uint256 amount)
        public
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

    /**
     * Calculates how many Miner tokens will be received for the amount of token specified. The token must be ERC20 compatible.
     * @param token address The address of the token being swapped for. Must be a valid ERC20 compatible token.
     * @param amount uint256 The amount of token to swap.
     * @return uint256 The amount of Miner token received for the specified token amount.
     */
    function calculateTokenToMinerSwap(address token, uint256 amount)
        public
        view
        returns (uint256)
    {
        uint256 tokenToEth = calculateTokenToEthSwap(token, amount);

        return _calculateEthToMinerSwap(tokenToEth);
    }

    /**
     * Swaps Ether for Miner. Emits a SwappedEthToMiner event if successful.
     * @param minerMin uint256 The minimum amount of Miner token to receive. Reverts if the minimum is not met.
     * @param deadline uint256 A timestamp indicating how long the swap will stay active. Reverts if expired.
     * @return uint256 The amount of Miner token swapped.
     */
    function swapEthToMiner(uint256 minerMin, uint256 deadline)
        external
        payable
        returns (uint256)
    {
        require(deadline >= block.timestamp, "MinerSwap/deadline-expired");

        uint256 eth = msg.value;

        require(eth > 0, "MinerSwap/deposit-invalid");

        uint256 minerOut = _calculateEthToMinerSwap(eth);

        require(minerOut >= minerMin, "MinerSwap/slippage");

        _asyncTransfer(owner(), eth);

        issuance.issue(_msgSender(), minerOut);

        emit SwappedEthToMiner(_msgSender(), address(issuance), eth, minerOut);

        return minerOut;
    }

    /**
     * Swaps a valid ERC20 token for Miner. Emits a SwappedTokenToMiner event if successful.
     * @param token address The address of the token being swapped. Must be a valid ERC20-compatible token with an existing liquidity pool on Uniswap.
     * @param amount uint256 The amount of token to swap for Miner.
     * @param minerMin uint256 The minimum amount of Miner token to receive. Reverts if the minimum is not met.
     * @param deadline uint256 A timestamp indicating how long the swap will stay active. Reverts if expired.
     * @return uint256 The amount of Miner token swapped.
     */
    function swapTokenToMiner(
        address token,
        uint256 amount,
        uint256 minerMin,
        uint256 deadline
    ) external returns (uint256) {
        IUniswapV2ERC20 erc20 = IUniswapV2ERC20(token);

        TransferHelper.safeTransferFrom(
            token,
            msg.sender,
            address(this),
            amount
        );

        TransferHelper.safeApprove(token, uniswapRouter, amount);

        IUniswapV2Router02 router = IUniswapV2Router02(uniswapRouter);

        address[] memory path = new address[](2);
        path[0] = address(erc20);
        path[1] = router.WETH();
        uint256 etherMin = calculateTokenToEthSwap(token, amount);

        require(
            _calculateEthToMinerSwap(etherMin) >= minerMin,
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

        uint256 minerOut = _calculateEthToMinerSwap(
            amounts[amounts.length - 1]
        );

        issuance.issue(_msgSender(), minerOut);

        emit SwappedTokenToMiner(
            _msgSender(),
            address(issuance),
            token,
            amount,
            minerOut,
            amounts[amounts.length - 1]
        );

        return minerOut;
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

    event SwappedEthToMiner(
        address indexed recipient,
        address indexed sender,
        uint256 amountIn,
        uint256 amountOut
    );

    event SwappedTokenToMiner(
        address indexed recipient,
        address indexed sender,
        address indexed token,
        uint256 amountIn,
        uint256 amountOut,
        uint256 ethAmount
    );
}
