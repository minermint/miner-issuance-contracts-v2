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
    hre.ethers.provider.getSigner()
  );
};

export const getUniswapV2Factory = async (): Promise<Contract> => {
  const router = getUniswapV2Router02();
  return new Contract(
    await router.factory(),
    JSON.stringify(ArtifactIUniswapV2Factory.abi),
    hre.ethers.provider.getSigner()
  );
};

export const getERC20Token = (address: string): Contract => {
  return new Contract(
    address,
    ArtifactIERC20.abi,
    hre.ethers.provider.getSigner()
  );
};

export const getAggregatorV3ETHUSD = (): Contract => {
  return new Contract(
    testConfig.aggregatorV3ETHUSD,
    JSON.stringify(ArtifactAggregatorV3Interface),
    hre.ethers.provider.getSigner()
  );
};
