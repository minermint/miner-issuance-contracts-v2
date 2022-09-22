import { ethers, BigNumber } from "ethers";
import { FIXED_MINER_OUT } from "../../config";

export const EXACT_MINER_OUT: BigNumber =
  ethers.utils.parseEther(FIXED_MINER_OUT);
