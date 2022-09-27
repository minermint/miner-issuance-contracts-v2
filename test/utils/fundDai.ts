import { getUniswapV2Router02 } from "./contracts/periphery";
import { getTwentyMinuteDeadline } from "./deadline";
import { testConfig } from "../../config";
import { getBestPricePathExactOut } from "./hops";

export default async () => {
  const router = getUniswapV2Router02();
  const exactDaiOut = hre.ethers.utils.parseEther(testConfig.balances.dai);

  const path = await getBestPricePathExactOut(
    exactDaiOut,
    await router.WETH(),
    testConfig.currencies.dai
  );

  const maxETHIn = (await router.getAmountsIn(exactDaiOut, path))[0];

  await router.swapETHForExactTokens(
    exactDaiOut,
    path,
    await hre.ethers.provider.getSigner().getAddress(),
    await getTwentyMinuteDeadline(),
    { value: maxETHIn }
  );
};
