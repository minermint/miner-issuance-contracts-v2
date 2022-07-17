export async function getTwentyMinuteDeadline() {
  return getDeadline(20);
}

export async function getOneDayDeadline() {
  return getDeadline(24 * 60);
}

export async function getDeadline(minutes: number) {
  const timestamp = (await hre.ethers.provider.getBlock("latest")).timestamp;
  const advance = minutes * 60;
  return timestamp + advance;
}
