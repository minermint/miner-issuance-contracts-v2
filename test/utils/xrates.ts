import { BigNumber } from "ethers";
import { getTruflationOracle } from "./contracts/core";
import {
  getUniswapV2Router02,
  getAggregatorV3ETHUSD,
} from "./contracts/periphery";
import { getBestPricePathExactOut } from "./hops";

/**
 * Calculates the amount of tokens required to exchange to an exact amount of
 * Miner.
 *
 * @param tokenAddress The address of the token whose amountIn value needs to
 * be calculated.
 * @param exactAmountOut The exact amount of Miner out this calculation should
 * determine.
 * @return The equivalent amount of tokens that would be required to
 * successfully generate the exact amount of Miner.
 */
export const calculateTokensToExactMiner = async (
  tokenAddress: string,
  exactAmountOut: BigNumber
): Promise<BigNumber> => {
  const router = getUniswapV2Router02();

  const requiredETHOut = await getMinerToETH(exactAmountOut);

  const path = await getBestPricePathExactOut(
    requiredETHOut,
    await router.WETH(),
    tokenAddress
  );

  const requiredTokensIn = (await router.getAmountsIn(requiredETHOut, path))[0];

  return requiredTokensIn;
};

/**
 * Gets the amount of ETH based on the Miner to ETH exchange rate.
 *
 * Pass in a value of 1e18 for the exchange rate.
 *
 * @param amount The amount of Miner to convert.
 * @returns The equivalent amount of ETH.
 */
export const getMinerToETH = async (amount: BigNumber): Promise<BigNumber> => {
  const oracle = await getTruflationOracle();
  const aggregator = getAggregatorV3ETHUSD();

  // 1 MINER : x USD
  const usdPerMiner = await oracle.getTodaysExchangeRate();

  // 1 USD : x ETH
  const roundData = await aggregator.latestRoundData();
  const usdPerETH = roundData[1];

  // amountETH = amount * usdPerMiner / usdPerETH
  return usdPerMiner.mul(amount).div(usdPerETH);
};
