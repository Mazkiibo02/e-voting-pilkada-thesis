import fs from "fs";
import path from "path";

const outputPath = path.join(__dirname, "../data/tps.json");

export function generateTPSData(totalTPS: number = 1000) {
  const data = [];

  for (let i = 1; i <= totalTPS; i++) {
    const registered = 300;

    // turnout normal 60–90%
    const turnoutRate = 0.6 + Math.random() * 0.3;
    const turnout = Math.floor(registered * turnoutRate);

    // distribusi suara normal 40–60%
    const candidate1Ratio = 0.4 + Math.random() * 0.2;
    const candidate1Votes = Math.floor(turnout * candidate1Ratio);
    const candidate2Votes = turnout - candidate1Votes;

    data.push({
      tpsId: i,
      registered,
      turnout,
      candidate1Votes,
      candidate2Votes
    });
  }

  // Tambahkan beberapa TPS anomali
  for (let i = 0; i < 10; i++) {
    data[i].turnout = 300; // 100% turnout
    data[i].candidate1Votes = 295; // hampir 100%
    data[i].candidate2Votes = 5;
  }

  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log("TPS data generated:", totalTPS);
}