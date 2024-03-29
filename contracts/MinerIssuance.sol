// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.2 <0.9.0;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/PullPayment.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/lib/contracts/libraries/TransferHelper.sol";

import "./MinerReserve.sol";
import "./IUSDMinerPair.sol";

/// @title Issue Miner for Ether and other ERC20 tokens.
contract MinerIssuance is PullPayment, Ownable, ReentrancyGuard {
    address public priceFeed;

    address public pair;

    address public reserve;

    address public uniswapRouter;

    /**
     * Initializes the Issuance contract.
     * @param pair_ address The USD Miner pair.
     * @param reserve_ address The MinerReserve contract.
     * @param uniswapRouter_ address The Uniswap Router contract.
     */
    constructor(
        address pair_,
        address reserve_,
        address uniswapRouter_
    ) {
        _changePair(pair_);
        _changeReserve(reserve_);
        _changeUniswapRouter(uniswapRouter_);
    }

    /**
     * Sets the USD to Miner pair address.
     * @param pair_ address The USD Miner pair address.
     */
    function changePair(address pair_) external onlyOwner {
        _changePair(pair_);
    }

    function _changePair(address pair_) internal {
        pair = pair_;
    }

    /**
     * Sets the Reserve contract.
     * @param reserve_ address The Reserve contract.
     */
    function changeReserve(address reserve_) external onlyOwner {
        _changeReserve(reserve_);
    }

    function _changeReserve(address reserve_) internal {
        reserve = reserve_;
    }

    /**
     * Changes the Price Feed contract. This will be a valid Chainlink
     * contract. A list of contracts is available at
     * https://docs.chain.link/docs/ethereum-addresses/.
     * @param priceFeed_ address The Price Feed contract.
     */
    function changePriceFeed(address priceFeed_) external onlyOwner {
        _changePriceFeed(priceFeed_);
    }

    function _changePriceFeed(address priceFeed_) internal {
        priceFeed = priceFeed_;
    }

    /**
     * Change the uniswap router contract.
     */
    function changeUniswapRouter(address uniswapRouter_) external onlyOwner {
        _changeUniswapRouter(uniswapRouter_);
    }

    function _changeUniswapRouter(address uniswapRouter_) internal {
        uniswapRouter = uniswapRouter_;
    }

    /**
     * Calculates the price of a single Miner token in Ether. The amount will
     * be returned in Wei, x ether * 10^18 (18 dp).
     * @return uint256 The price off a single Miner token in Ether.
     */
    function calculateETHPerMiner() external view returns (uint256) {
        return _calculateETHPerMiner();
    }

    function _calculateETHPerMiner() internal view returns (uint256) {
        require(priceFeed != address(0), "Issuance/no-oracle-set");

        uint256 usdPerMiner = IUSDMinerPair(pair).getPrice();

        (, int256 usdPerETH, , , ) = AggregatorV3Interface(priceFeed)
            .latestRoundData();

        // latest per miner price * by dp of swap contract, divide by latest
        // price per eth. the result will be the price of 1 miner in wei.
        return
            (usdPerMiner *
                10**uint256(AggregatorV3Interface(priceFeed).decimals())) /
            uint256(usdPerETH);
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
        // solhint-disable-next-line not-rely-on-time
        require(deadline >= block.timestamp, "Issuance/deadline-expired");

        uint256 ethIn = msg.value;

        require(ethIn > 0, "Issuance/deposit-invalid");

        uint256 minerOut = _calculateETHToMiner(ethIn);

        require(minerOut >= minMinerOut, "Issuance/insufficient-amount-out");

        _asyncTransfer(owner(), ethIn);

        MinerReserve(reserve).issue(_msgSender(), minerOut);

        emit Issued(_msgSender(), reserve, ethIn, minerOut);

        return minerOut;
    }

    /**
     * Issue exactly `exactMinerOut` Miner for no more than `maxETHIn` ETH. Any
     * additional ether will be refunded back to the user.
     *
     * @param exactMinerOut uint256 The exact amount of Miner token to receive.
     * Reverts if the minimum is not met.
     * @param deadline uint256 A timestamp indicating how long the swap will
     * stay active. Reverts if expired.
     * @return uint256 The amount of Miner token swapped.
     */
    function issueExactMinerForETH(uint256 exactMinerOut, uint256 deadline)
        external
        payable
        nonReentrant
        returns (uint256)
    {
        // solhint-disable-next-line not-rely-on-time
        require(deadline >= block.timestamp, "Issuance/deadline-expired");

        uint256 ethIn = msg.value;

        require(ethIn > 0, "Issuance/deposit-invalid");

        uint256 requiredETHIn = _calculateMinerToETH(exactMinerOut);

        require(requiredETHIn <= ethIn, "Issuance/excessive-amount-in");

        _asyncTransfer(owner(), requiredETHIn);

        // refund excess ETH.
        if (ethIn > requiredETHIn) {
            // solhint-disable-next-line avoid-low-level-calls
            (bool success, ) = address(msg.sender).call{
                value: ethIn - requiredETHIn
            }(new bytes(0));

            require(success, "Issuance/cannot-refund-ether");
        }

        MinerReserve(reserve).issue(_msgSender(), exactMinerOut);

        emit Issued(_msgSender(), reserve, requiredETHIn, exactMinerOut);

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
        IUniswapV2Router02 router = IUniswapV2Router02(uniswapRouter);

        // if the path is invalid, it should fail here.
        uint256 expectedETHOut = router.getAmountsOut(amount, path)[
            path.length - 1
        ];

        uint256 expectedMinerOut = _calculateETHToMiner(expectedETHOut);

        require(
            expectedMinerOut >= minMinerOut,
            "Issuance/insufficient-amount-out"
        );

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
            "Issuance/invalid-eth-amount"
        );

        // the amount of eth received from the swap may be more than the min.
        // So, recheck actual miner to issue.
        uint256 actualMinerOut = _calculateETHToMiner(
            amounts[amounts.length - 1]
        );

        MinerReserve(reserve).issue(_msgSender(), actualMinerOut);

        emit Issued(_msgSender(), reserve, amount, actualMinerOut);

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
        IUniswapV2Router02 router = IUniswapV2Router02(uniswapRouter);

        uint256 requiredETHIn = _calculateMinerToETH(exactMinerOut);
        uint256 requiredTokensIn = router.getAmountsIn(requiredETHIn, path)[0];

        require(
            requiredTokensIn <= maxAmountIn,
            "Issuance/excessive-amount-in"
        );

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
            "Issuance/invalid-eth-amount"
        );

        MinerReserve(reserve).issue(_msgSender(), exactMinerOut);

        emit Issued(_msgSender(), reserve, requiredTokensIn, exactMinerOut);

        return exactMinerOut;
    }

    receive() external payable {
        _asyncTransfer(owner(), msg.value);
    }

    event Issued(
        address indexed recipient,
        address indexed sender,
        uint256 amountIn,
        uint256 amountOut
    );
}
