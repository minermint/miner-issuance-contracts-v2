import { waffle } from "hardhat";

export async function mineNBlocks(blocks: Number) {
    for (let index = 0; index < blocks; index++) {
        await waffle.provider.send("evm_mine", []);
    }
}

export async function advanceBlockTimestamp(newTimestamp: Number) {
    await waffle.provider.send("evm_increaseTime", [newTimestamp]);
    await waffle.provider.send("evm_mine", []);
}
