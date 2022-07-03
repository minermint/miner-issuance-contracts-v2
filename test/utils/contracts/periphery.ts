import { waffle } from "hardhat";
import { Contract } from "ethers";
import { testConfig } from "../../../config";
import ArtifactIUniswapV2Router02 from "@uniswap/v2-periphery/build/IUniswapV2Router02.json";
import ArtifactIUniswapV2Factory from "@uniswap/v2-periphery/build/IUniswapV2Factory.json";
import ArtifactIERC20 from "@uniswap/v2-core/build/IERC20.json";
import ArtifactAggregatorV3Interface from "@chainlink/contracts/abi/v0.8/AggregatorV3Interface.json";

export const getUniswapV2Router02 = (): Contract => {
  return new Contract(
    testConfig.uniswapV2Router02,
    JSON.stringify(ArtifactIUniswapV2Router02.abi),
    waffle.provider.getSigner()
  );
};

export const getUniswapV2Factory = async (): Promise<Contract> => {
  const router = getUniswapV2Router02();
  return new Contract(
    await router.factory(),
    JSON.stringify(ArtifactIUniswapV2Factory.abi),
    waffle.provider.getSigner()
  );
};

export const getMinerETHPair = async () => {
  const deployer = waffle.provider.getSigner();
  const router = getUniswapV2Router02();
  const factory = await getUniswapV2Factory();
  const pair = await factory.getPair(router.WETH(), testConfig.miner);

  return new Contract(pair, ArtifactIERC20.abi, deployer);
};

export const getDai = (): Contract => {
  return new Contract(
    testConfig.dai,
    JSON.stringify(ArtifactIERC20.abi),
    waffle.provider.getSigner()
  );
};

export const getAggregatorV3ETHUSD = (): Contract => {
  return new Contract(
    testConfig.aggregatorV3ETHUSD,
    JSON.stringify(ArtifactAggregatorV3Interface),
    waffle.provider.getSigner()
  );
};
