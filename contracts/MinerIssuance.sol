// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.0 <0.9.0;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/PullPayment.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2ERC20.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/lib/contracts/libraries/TransferHelper.sol";

import "./oracles/TruflationUSDMinerPairMock.sol";
import "./MinerReserve.sol";

/// @title Issue Miner for Ether and other ERC20 tokens.
contract MinerIssuance is PullPayment, Ownable {
    AggregatorV3Interface public priceFeedOracle;

    TruflationUSDMinerPairMock public truflation;

    MinerReserve public reserve;

    address public uniswapRouter;

    /**
     * Initializes the MinerIssuance contract.
     * @param truflationAddress TruflationUSDMinerPairMock The Miner oracle contract.
     * @param reserveAddress MinerReserve The MinerReserve contract.
     * @param uniswapRouterAddress address The Uniswap Router contract.
     */
    constructor(
        TruflationUSDMinerPairMock truflationAddress,
        MinerReserve reserveAddress,
        address uniswapRouterAddress
    ) {
        _setMinerOracle(truflationAddress);
        _setMinerReserve(reserveAddress);
        _setUniswapRouterAddress(uniswapRouterAddress);
    }

    /**
     * Sets the Miner oraacle contract.
     * @param truflationAddress IMinerTruflationUSDMinerPairMockOracle The Miner oracle contract.
     */
    function setMinerOracle(TruflationUSDMinerPairMock truflationAddress)
        public
        onlyOwner
    {
        _setMinerOracle(truflationAddress);
    }

    /**
     * Sets the MinerReserve contract.
     * @param reserveAddress MinerReserve The MinerReserve contract.
     */
    function setReserve(MinerReserve reserveAddress) public onlyOwner {
        _setMinerReserve(reserveAddress);
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

    function _setMinerOracle(TruflationUSDMinerPairMock truflationAddress)
        private
    {
        truflation = truflationAddress;
    }

    function _setMinerReserve(MinerReserve reserveAddress) private {
        reserve = reserveAddress;
    }

    function _setUniswapRouterAddress(address uniswapRouterAddress) private {
        uniswapRouter = uniswapRouterAddress;
    }

    /**
     * Calculates the price of a single Miner token in Ether. The amount will be returned in Wei, x ether * 10^18 (18 dp).
     * @return uint256 The price off a single Miner token in Ether.
     */
    function calculateETHPerMiner() external view returns (uint256) {
        return _calculateETHPerMiner();
    }

    function _calculateETHPerMiner()
        internal
        view
        priceFeedSet
        returns (uint256)
    {
        uint256 usdPerMiner = truflation.getTodaysExchangeRate();

        (, int256 usdPerETH, , , ) = priceFeedOracle.latestRoundData();

        // latest per miner price * by 18 dp, divide by latest price per eth.
        // the result will be the price of 1 miner in wei.
        return (usdPerMiner * 1e18) / uint256(usdPerETH);
    }

    /**
     * Calculate how much miner will be received for `amount` ETH.
     * @dev The amount of Ether must be in Wei, x ether * 10^18 (18 dp).
     * @param amount uint256 The amount of Ether to swap.
     * @return uint256 The amount of Miner tokens received for the specified Ether amount.
     */
    function calculateETHToMiner(uint256 amount)
        external
        view
        returns (uint256)
    {
        return _calculateETHToMiner(amount);
    }

    function _calculateETHToMiner(uint256 amount)
        internal
        view
        returns (uint256)
    {
        uint256 ethPerMinerRate = _calculateETHPerMiner();

        // multiply sent eth by 10^18 so that it transfers the correct amount of
        // miner.
        return (amount * 1e18) / ethPerMinerRate;
    }

    function calculateMinerToETH(uint256 amount)
        external
        view
        returns (uint256)
    {
        return _calculateMinerToETH(amount);
    }

    function _calculateMinerToETH(uint256 amount)
        internal
        view
        returns (uint256)
    {
        uint256 ethPerMinerRate = _calculateETHPerMiner();

        // x Miner / 1 Miner To ETH Exchange Rate = y ETH
        return (amount * ethPerMinerRate) / 1e18;
    }

    /**
     * Issue at least `minMinerOut` Miner for an exact amount of ETH.
     * @param minMinerOut uint256 The minimum amount of Miner token to receive.
     * Reverts if the minimum is not met.
     * @param deadline uint256 A timestamp indicating how long the swap will
     * stay active. Reverts if expired.
     * @return uint256 The amount of Miner token swapped.
     */
    function issueMinerForExactETH(uint256 minMinerOut, uint256 deadline)
        external
        payable
        returns (uint256)
    {
        require(deadline >= block.timestamp, "MinerIssuance/deadline-expired");

        uint256 ethIn = msg.value;

        require(ethIn > 0, "MinerIssuance/deposit-invalid");

        uint256 minerOut = _calculateETHToMiner(ethIn);

        require(minerOut >= minMinerOut, "MinerIssuance/slippage");

        _asyncTransfer(owner(), ethIn);

        reserve.issue(_msgSender(), minerOut);

        emit IssuedMinerForExactETH(
            _msgSender(),
            address(reserve),
            ethIn,
            minerOut
        );

        return minerOut;
    }

    /**
     * Issue at exactly `exactMinerOut` Miner for no more than `maxETHIn` ETH.
     * @param exactMinerOut uint256 The exact amount of Miner token to receive.
     * Reverts if the minimum is not met.
     * @param deadline uint256 A timestamp indicating how long the swap will
     * stay active. Reverts if expired.
     * @return uint256 The amount of Miner token swapped.
     */
    function issueExactMinerForETH(uint256 exactMinerOut, uint256 deadline)
        external
        payable
        returns (uint256)
    {
        require(deadline >= block.timestamp, "MinerIssuance/deadline-expired");

        uint256 ethIn = msg.value;

        require(ethIn > 0, "MinerIssuance/deposit-invalid");

        uint256 requiredETHIn = _calculateMinerToETH(exactMinerOut);

        require(ethIn >= requiredETHIn, "MinerIssuance/slippage");

        _asyncTransfer(owner(), requiredETHIn);

        // refund excess ETH.
        if (ethIn >= requiredETHIn) {
            (bool success, ) = address(msg.sender).call{
                value: ethIn - requiredETHIn
            }("");

            require(success, "MinerReserve/cannot-refund-ether");
        }

        reserve.issue(_msgSender(), exactMinerOut);

        emit IssuedExactMinerForETH(
            _msgSender(),
            address(reserve),
            requiredETHIn,
            exactMinerOut
        );

        return exactMinerOut;
    }

    /**
     * Issue at least `minMinerOut` Miner for exactly `amount` of `token`
     * tokens.
     * @ dev Emits a SwappedTokenToMiner event if successful.
     * @param path address[] The optimal path to take when swapping a token for
     * ETH. Must be a valid ERC20-compatible token and the final token must be
     * WETH.
     * @param amount uint256 The amount of token to swap for Miner.
     * @param minMinerOut uint256 The minimum amount of Miner token to receive. Reverts if the minimum is not met.
     * @param deadline uint256 A timestamp indicating how long the swap will stay active. Reverts if expired.
     * @return uint256 The amount of Miner token swapped.
     */
    function issueMinerForExactTokens(
        address[] calldata path, // No checks. Let uniswap validate the path.
        uint256 amount,
        uint256 minMinerOut,
        uint256 deadline
    ) external returns (uint256) {
        require(deadline >= block.timestamp, "MinerIssuance/deadline-expired");

        IUniswapV2Router02 router = IUniswapV2Router02(uniswapRouter);

        // if the path is invalid, it should fail here.
        uint256 expectedETHOut = router.getAmountsOut(amount, path)[
            path.length - 1
        ];

        uint256 expectedMinerOut = _calculateETHToMiner(expectedETHOut);

        require(expectedMinerOut >= minMinerOut, "MinerIssuance/slippage");

        TransferHelper.safeTransferFrom(
            path[0],
            msg.sender,
            address(this),
            amount
        );

        TransferHelper.safeApprove(path[0], uniswapRouter, amount);

        uint256 balanceBefore = payments(owner());

        uint256[] memory amounts = router.swapExactTokensForETH(
            amount,
            expectedETHOut,
            path,
            address(this),
            deadline
        );

        uint256 balanceAfter = payments(owner());

        require(
            balanceAfter == balanceBefore + amounts[amounts.length - 1],
            "MinerIssuance/invalid-eth-amount-transferred"
        );

        // the amount of eth received from the swap may be more than the min.
        // So, recheck actual miner to issue.
        uint256 actualMinerOut = _calculateETHToMiner(
            amounts[amounts.length - 1]
        );

        reserve.issue(_msgSender(), actualMinerOut);

        emit IssuedMinerForExactTokens(
            _msgSender(),
            address(reserve),
            amount,
            actualMinerOut
        );

        return actualMinerOut;
    }

    /**
     * Issue exactly `exactMinerOut` Miner for no more than `maxAmountIn` of
     * the selected token.
     * @ dev Emits a SwappedTokenToMiner event if successful.
     * @param path address[] The optimal path to take when swapping a token for
     * ETH. Must be a valid ERC20-compatible token and the final token must be
     * WETH.
     * @param maxAmountIn uint256 The maximum amount of tokens to swap for
     * Miner. Reverts if the minimum is not met.
     * @param exactMinerOut uint256 The exact amount of Miner token to receive.
     * @param deadline uint256 A timestamp indicating how long the swap will stay active. Reverts if expired.
     * @return uint256 The amount of Miner token swapped.
     */
    function issueExactMinerForTokens(
        address[] calldata path,
        uint256 maxAmountIn,
        uint256 exactMinerOut,
        uint256 deadline
    ) external returns (uint256) {
        require(deadline >= block.timestamp, "MinerIssuance/deadline-expired");

        IUniswapV2Router02 router = IUniswapV2Router02(uniswapRouter);

        uint256 requiredETHIn = _calculateMinerToETH(exactMinerOut);
        uint256 requiredTokensIn = router.getAmountsIn(requiredETHIn, path)[0];

        require(requiredTokensIn <= maxAmountIn, "MinerIssuance/slippage");

        TransferHelper.safeTransferFrom(
            path[0],
            msg.sender,
            address(this),
            requiredTokensIn
        );

        TransferHelper.safeApprove(path[0], uniswapRouter, requiredTokensIn);

        uint256 balanceBefore = payments(owner());

        uint256[] memory amounts = router.swapTokensForExactETH(
            requiredETHIn,
            requiredTokensIn,
            path,
            address(this),
            deadline
        );

        uint256 balanceAfter = payments(owner());

        require(
            balanceAfter == balanceBefore + amounts[amounts.length - 1],
            "MinerIssuance/invalid-eth-amount-transferred"
        );

        reserve.issue(_msgSender(), exactMinerOut);

        emit IssuedExactMinerForTokens(
            _msgSender(),
            address(reserve),
            requiredTokensIn,
            exactMinerOut
        );

        return exactMinerOut;
    }

    receive() external payable {
        _asyncTransfer(owner(), msg.value);
    }

    modifier priceFeedSet() {
        require(
            address(priceFeedOracle) != address(0),
            "MinerIssuance/no-oracle-set"
        );
        _;
    }

    event IssuedMinerForExactETH(
        address indexed recipient,
        address indexed sender,
        uint256 amountIn,
        uint256 amountOut
    );

    event IssuedMinerForExactTokens(
        address indexed recipient,
        address indexed sender,
        uint256 amountIn,
        uint256 amountOut
    );

    event IssuedExactMinerForETH(
        address indexed recipient,
        address indexed sender,
        uint256 amountIn,
        uint256 amountOut
    );

    event IssuedExactMinerForTokens(
        address indexed recipient,
        address indexed sender,
        uint256 amountIn,
        uint256 amountOut
    );
}
