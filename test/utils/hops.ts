import { Contract, BigNumber } from "ethers";
import ArtifactERC20 from "@uniswap/v2-core/build/IERC20.json";
import ArtifactIUniswapV2Pair from "@uniswap/v2-core/build/IUniswapV2Pair.json";
import * as Uniswap from "@uniswap/sdk";
import flatMap from "lodash.flatmap";

const SELECTED_CHAIN = Uniswap.ChainId.GÖRLI;

// base tokens for finding best price. The more base tokens the more accurate
// the pricing.
const BASES: {
  [chainId in Uniswap.ChainId]?: { [address: string]: string };
} = {
  [Uniswap.ChainId.MAINNET]: {
    "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599": "WBTC", // Wrapped BTC
    "0x6B175474E89094C44Da98b954EedeAC495271d0F": "DAI", // Dai
    "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48": "USDC", // USDC
    "0xdAC17F958D2ee523a2206206994597C13D831ec7": "USDT", // USDT
    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2": "WETH", // WETH
  },
  [SELECTED_CHAIN]: {
    "0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60": "DAI",
    "0xD87Ba7A50B2E7E660f678A895E4B72E7CB4CCd9C": "USDC",
    "0xC04B0d3107736C32e19F1c62b2aF67BE61d63a05": "WBTC",
    "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6": "WETH",
  },
};

const MAX_HOPS = 3;

const getTradingPairs = async (
  fromToken: Uniswap.Token,
  toToken: Uniswap.Token
) => {
  const tokens: any[] = [];

  for (const base in BASES[SELECTED_CHAIN]) {
    const token = new Contract(base, ArtifactERC20.abi, hre.ethers.provider);

    tokens.push(
      new Uniswap.Token(
        SELECTED_CHAIN,
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

  const filteredPairs = await allPairs
    .filter(([t0, t1]) => t0.address !== t1.address)
    .reduce((previousValue, currentValue) => {
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
    .reduce((previousValue, currentValue) => {
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
    // strip out pairs without a reserve, I.e. unfunded pools.
    const pairAddress = Uniswap.Pair.getAddress(
      filteredPairs[i][0],
      filteredPairs[i][1]
    );
    const iface = new hre.ethers.utils.Interface(ArtifactIUniswapV2Pair.abi);
    const bytecode = await hre.ethers.provider.getCode(pairAddress);
    const selector = iface.getSighash(iface.getFunction("getReserves"));

    if (bytecode.includes(selector.slice(2, 10))) {
      pairs.push(
        await Uniswap.Fetcher.fetchPairData(
          filteredPairs[i][0],
          filteredPairs[i][1],
          hre.ethers.provider
        )
      );
    }
  }

  return pairs;
};

/**
 * Get the best price path for exactly the amount of token in.
 *
 * @param {BigNumber} exactAmountIn The exact amount of token in.
 * @param {string} tokenInAddress The address of the token representing the
 * exact "in" amount.
 * @param {string} tokenOutAddress The address of the token whose "best price"
 * we are trying to determine.
 * @returns An array of token addresses representing the best price path from
 * tokenIn to tokenOut for the exact amount of tokenIn.
 */
export const getBestPricePathExactIn = async (
  exactAmountIn: BigNumber,
  tokenInAddress: string,
  tokenOutAddress: string
) => {
  const tokenIn = await getUniswapToken(tokenInAddress);

  const tokenOut = await getUniswapToken(tokenOutAddress);

  const pairs = await getTradingPairs(tokenIn, tokenOut);

  const bestTrades = Uniswap.Trade.bestTradeExactIn(
    pairs,
    new Uniswap.TokenAmount(
      tokenIn,
      Uniswap.JSBI.BigInt(exactAmountIn.toString())
    ),
    tokenOut,
    { maxHops: MAX_HOPS, maxNumResults: 1 }
  );

  const bestTrade = bestTrades.pop();

  return bestTrade
    ? bestTrade.route.path.map((token) => token.address) ?? []
    : [];
};

/**
 * Get the best price path for exactly the amount of token out.
 *
 * The order of tokenIn and tokenout are reversed in the case of an exact out
 * best price. For example, if DAI is being swapped for WETH, tokenOut will
 * be WETH and tokenIn will be DAI.
 *
 * @param {BigNumber} exactAmountOut The exact amount of token out.
 * @param {string} tokenInAddress The address of the token whose "best price" we
 * are trying to determine.
 * @param {string} tokenOutAddress The address of the token representing the
 * exact "out" amount.
 * @return An array of token addresses representing the best price path from
 * tokenOut to tokenIn for the exact amount of tokenOut.
 */
export const getBestPricePathExactOut = async (
  exactAmountOut: BigNumber,
  tokenInAddress: string,
  tokenOutAddress: string
) => {
  const tokenOut = await getUniswapToken(tokenOutAddress);
  const tokenIn = await getUniswapToken(tokenInAddress);

  const pairs = await getTradingPairs(tokenIn, tokenOut);

  const bestTrades = Uniswap.Trade.bestTradeExactOut(
    pairs,
    tokenIn,
    new Uniswap.TokenAmount(
      tokenOut,
      Uniswap.JSBI.BigInt(exactAmountOut.toString())
    ),
    { maxHops: MAX_HOPS, maxNumResults: 1 }
  );

  const bestTrade = bestTrades.pop();

  return bestTrade
    ? bestTrade.route.path.map((token) => token.address) ?? []
    : [];
};

const getUniswapToken = async (address: string): Promise<Uniswap.Token> => {
  const token = new Contract(address, ArtifactERC20.abi, hre.ethers.provider);

  return new Uniswap.Token(
    SELECTED_CHAIN,
    token.address,
    await token.decimals(),
    await token.symbol(),
    await token.name()
  );
};
