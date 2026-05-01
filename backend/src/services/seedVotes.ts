import { contract } from "./blockchain";

export async function seedDummyVotes() {
  console.log("Seeding dummy votes...");

  const normalTPS = [1,2,3,4,5,6,7,8,9];
  const anomalyTPS = 10;

  // TPS normal
  for (let tps of normalTPS) {
    for (let i = 0; i < 20; i++) {
      await contract.castVote(tps, 1);
    }
  }

  // TPS anomali (lonjakan)
  for (let i = 0; i < 200; i++) {
    await contract.castVote(anomalyTPS, 1);
  }

  console.log("Dummy votes inserted!");
}