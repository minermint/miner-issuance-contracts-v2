import { BigNumber } from "ethers";
import { getTruflationOracle } from "./contracts/core";
import {
  getUniswapV2Router02,
  getAggregatorV3ETHUSD,
} from "./contracts/periphery";

/**
 * Gets the amount of tokens based on the Miner to token exchange rate.
 *
 * Pass in a value of 1e18 for the exchange rate.
 *
 * The exchange rate is always computed through ETH (I.e. Miner -> ETH ->
 * Token), so the path MUST include the WETH token address as the last value in * the path.
 */
export const getMinerToTokens = async (
  path: string[] | undefined,
  amount: BigNumber
): Promise<BigNumber> => {
  const router = getUniswapV2Router02();

  const amountsOut = await router.getAmountsOut(getMinerToETH(amount), path);

  return amountsOut[1];
};

/**
 * Gets the amount of ETH based on the Miner to ETH exchange rate.
 *
 * Pass in a value of 1e18 for the exchange rate.
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
