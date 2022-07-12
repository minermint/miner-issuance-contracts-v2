import { waffle } from "hardhat";
import { Contract, BigNumber } from "ethers";
import ArtifactERC20 from "@uniswap/v2-core/build/IERC20.json";
import * as Uniswap from "@uniswap/sdk";
import flatMap from "lodash.flatmap";

// base tokens for finding best price. The more base tokens the more accurate
// the pricing.
const BASES: {
  [chainId in Uniswap.ChainId]?: { [tokenName: string]: string };
} = {
  [Uniswap.ChainId.KOVAN]: {
    "0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa": "DAI", // Dai
    "0xe22da380ee6B445bb8273C81944ADEB6E8450422": "USDC", // USDC
    "0xd0A1E359811322d97991E03f863a0C30C2cF029C": "WETH", // WETH
  },
};

const MAX_HOPS = 3;

const getTradingPairs = async (
  fromToken: Uniswap.Token,
  toToken: Uniswap.Token
) => {
  const tokens: any[] = [];

  for (const base in BASES[Uniswap.ChainId.KOVAN]) {
    const token = new Contract(base, ArtifactERC20.abi, waffle.provider);

    tokens.push(
      new Uniswap.Token(
        Uniswap.ChainId.KOVAN,
        token.address,
        await token.decimals(),
        await token.symbol(),
        await token.name()
      )
    );
  }
  const allPairs = [];

  // add tokenA tokenB pair.
  allPairs.push([fromToken, toToken]);

  // add fromToken other tokens pairs
  allPairs.push(...tokens.map((token) => [fromToken, token]));

  // add toToken other tokens pairs
  allPairs.push(...tokens.map((token) => [toToken, token]));

  allPairs.push(
    ...flatMap(tokens, (token) =>
      tokens.map((otherToken) => [token, otherToken])
    )
  );

  const filteredPairs = allPairs
    .filter(([t0, t1]) => t0.address !== t1.address)
    .reduce(function (previousValue, currentValue) {
      if (
        !previousValue.find(
          (value) =>
            value[0].address === currentValue[0].address &&
            value[1].address === currentValue[1].address
        )
      ) {
        previousValue.push(currentValue);
      }

      return previousValue;
    }, [])
    .reduce(function (previousValue, currentValue) {
      if (
        !previousValue.find(
          (value: any) =>
            value[0].address === currentValue[1].address &&
            value[1].address === currentValue[0].address
        )
      ) {
        previousValue.push(currentValue);
      }

      return previousValue;
    }, []);

  const pairs = [];

  for (var i = 0; i < filteredPairs.length; i++) {
    pairs.push(
      await Uniswap.Fetcher.fetchPairData(
        filteredPairs[i][0],
        filteredPairs[i][1],
        waffle.provider
      )
    );
  }

  return pairs;
};

/**
 * Get the best price path for exactly the amount of from token.
 *
 * @param {string} tokenInAddress The address of the token representing the
 * exact "in" amount.
 * @param {string} tokenOutAddress The address of the token whose "best price"
 * we are trying to determine.
 * @returns An array of token addresses representing the best price path from
 * tokenIn to tokenOut for the exact amount of tokenIn.
 */
export const getBestPricePathExactIn = async (
  amount: BigNumber,
  tokenInAddress: string,
  tokenOutAddress: string
) => {
  const tokenIn = await getUniswapToken(tokenInAddress);

  const tokenOut = await getUniswapToken(tokenOutAddress);

  const pairs = await getTradingPairs(tokenIn, tokenOut);

  const bestTrades = Uniswap.Trade.bestTradeExactIn(
    pairs,
    new Uniswap.TokenAmount(tokenIn, Uniswap.JSBI.BigInt(amount.toString())),
    tokenOut,
    { maxHops: MAX_HOPS, maxNumResults: 1 }
  );

  const bestTrade = bestTrades.pop();

  return bestTrade
    ? bestTrade.route.path.map((token) => token.address) ?? []
    : [];
};

/**
 * Get the best price path for exactly the amount of tokenOut.
 *
 * The order of tokenIn and tokenout are reversed in the case of an exact out
 * best price. For example, if DAI is being swapped for WETH, tokenOut will
 * be WETH and tokenIn will be DAI.
 *
 * @param {string} tokenOutAddress The address of the token representing the
 * exact "out" amount.
 * @param {string} tokenInAddress The address of the token whose "best price" we
 * are trying to determine.
 * @returns An array of token addresses representing the best price path from
 * tokenOut to tokenIn for the exact amount of tokenOut.
 */
export const getBestPricePathExactOut = async (
  amount: BigNumber,
  tokenOutAddress: string,
  tokenInAddress: string
) => {
  const tokenOut = await getUniswapToken(tokenOutAddress);
  const tokenIn = await getUniswapToken(tokenInAddress);

  const pairs = await getTradingPairs(tokenIn, tokenOut);

  const bestTrades = Uniswap.Trade.bestTradeExactOut(
    pairs,
    tokenIn,
    new Uniswap.TokenAmount(tokenOut, Uniswap.JSBI.BigInt(amount.toString())),
    { maxHops: MAX_HOPS, maxNumResults: 1 }
  );

  const bestTrade = bestTrades.pop();

  return bestTrade
    ? bestTrade.route.path.map((token) => token.address) ?? []
    : [];
};

const getUniswapToken = async (address: string): Promise<Uniswap.Token> => {
  const token = new Contract(address, ArtifactERC20.abi, waffle.provider);

  return new Uniswap.Token(
    Uniswap.ChainId.KOVAN,
    token.address,
    await token.decimals(),
    await token.symbol(),
    await token.name()
  );
};
