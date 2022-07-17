import { BigNumber } from "ethers";
import { getTruflationOracle } from "./contracts/core";
import {
  getUniswapV2Router02,
  getAggregatorV3ETHUSD,
} from "./contracts/periphery";
import { getBestPricePathExactIn, getBestPricePathExactOut } from "./hops";

/**
 * Calculates the amount of tokens required to exchange to an exact amount of
 * Miner.
 *
 * @param {string} tokenAddress The address of the token whose amountIn value
 * needs to be calculated.
 * @param {BigNumber} exactAmountOut The exact amount of Miner out this
 * calculation should determine.
 * @return The equivalent amount of tokens that would be required to
 * successfully generate the exact amount of Miner.
 */
 // getTokensInFromExactMinerOut
export const calculateTokensToExactMiner = async (
  tokenAddress: string,
  exactAmountOut: BigNumber
): Promise<BigNumber> => {
  const router = getUniswapV2Router02();

  const requiredETHOut = await getMinerToETH(exactAmountOut);

  const path = await getBestPricePathExactOut(
    requiredETHOut,
    tokenAddress,
    await router.WETH()
  );

  const requiredTokensIn = (await router.getAmountsIn(requiredETHOut, path))[0];

  return requiredTokensIn;
};

/**
 * Calculates the amount of miner that will be received for an exact amount of
 * tokens.
 *
 * @param {string} tokenAddress The address of the token in.
 * @param {BigNumber} exactAmountIn The exact amount of token in this
 * calculation should determine.
 * @return The equivalent amount of miner that would be received in relation
 * to an exact amount of tokens in.
 */
 //getMinerOutFromExactTokensIn
export const calculateExactTokensToMiner = async (
  tokenAddress: string,
  exactAmountIn: BigNumber
): Promise<BigNumber> => {
  const router = getUniswapV2Router02();

  const path = await getBestPricePathExactIn(
    exactAmountIn,
    tokenAddress,
    await router.WETH()
  );

  const amounts = await router.getAmountsOut(exactAmountIn, path);

  const requiredETHOut = amounts[amounts.length - 1];

  const requiredMinerOut = await getETHToMiner(requiredETHOut);

  return requiredMinerOut;
};

/**
 * Gets the amount of ETH based on the Miner to ETH exchange rate.
 *
 * Pass in a value of 1e18 for the exchange rate.
 *
 * @param {BigNumber} amount The amount of Miner to convert.
 * @return The equivalent amount of ETH.
 */
export const getMinerToETH = async (amount: BigNumber): Promise<BigNumber> => {
  return amount.mul(await getETHPerMiner()).div(hre.ethers.utils.parseEther("1"));
};

/**
 * Gets the amount of Miner based on the ETH to Miner exchange rate.
 *
 * Pass in a value of 1e18 for the exchange rate.
 *
 * @param {BigNumber} amount The amount of ETH to convert.
 * @return The equivalent amount of Miner.
 */
export const getETHToMiner = async (amount: BigNumber): Promise<BigNumber> => {
  return amount.mul(hre.ethers.utils.parseEther("1")).div(await getETHPerMiner());
};

/**
 * Gets the Miner to ETH exchange rate (1 Miner = x ETH).
 *
 * A combination of Truflation and Chainlink Aggregators are used to calculate
 * the USD price of Miner and ETH.
 *
 * @returns Promise<BigNumber> The amount of ETH for 1 Miner.
 */
export const getETHPerMiner = async (): Promise<BigNumber> => {
  const oracle = await getTruflationOracle();
  const aggregator = getAggregatorV3ETHUSD();

  // 1 MINER : x USD
  const usdPerMiner = await oracle.getTodaysExchangeRate();

  // 1 ETH : y USD
  const roundData = await aggregator.latestRoundData();
  const usdPerETH = roundData[1];

  return hre.ethers.utils.parseEther("1").mul(usdPerMiner).div(usdPerETH);
};

export const getETHPerToken = async (address: string): Promise<BigNumber> => {
  const router = getUniswapV2Router02();

  const path = await getBestPricePathExactIn(
    hre.ethers.utils.parseEther("1"),
    address,
    await router.WETH()
  );

  const amounts = await router.getAmountsOut(hre.ethers.utils.parseEther("1"), path);

  return amounts[amounts.length - 1];
};
