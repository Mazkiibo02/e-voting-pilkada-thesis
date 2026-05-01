const { execSync, spawn } = require("child_process");
const fs = require("fs");

function run(cmd, options = {}) {
  execSync(cmd, { stdio: "inherit", ...options });
}

(async () => {
  try {
    console.log("STARTING BLOCKCHAIN NODE...");

    // 1. Start hardhat node (background)
    const nodeProcess = spawn("npx", ["hardhat", "node"], {
      cwd: "./blockchain",
      stdio: "inherit",
      shell: true,
    });

    // tunggu node siap
    await new Promise((res) => setTimeout(res, 4000));

    console.log("DEPLOYING CONTRACT...");

    // 2. Deploy contract
    const deployOutput = execSync(
      "cd blockchain && npx hardhat run scripts/deploy.js --network localhost"
    ).toString();

    const match = deployOutput.match(/EVoting deployed to: (0x[a-fA-F0-9]+)/);
    if (!match) throw new Error("FAILED TO GET CONTRACT ADDRESS");

    const address = match[1];
    console.log("CONTRACT:", address);

    // 3. Update backend contract address
    const backendPath = "./backend/src/services/blockchain.ts";

    let backendFile = fs.readFileSync(backendPath, "utf-8");

    backendFile = backendFile.replace(
      /const CONTRACT_ADDRESS = ".*";/,
      `const CONTRACT_ADDRESS = "${address}";`
    );

    fs.writeFileSync(backendPath, backendFile);

    console.log("ADDRESS UPDATED IN BACKEND");

    // 4. Update seedVotes.js contract address
    const seedPath = "./blockchain/scripts/seedVotes.js";

    let seedFile = fs.readFileSync(seedPath, "utf-8");

    seedFile = seedFile.replace(
      /const CONTRACT_ADDRESS = ".*";/,
      `const CONTRACT_ADDRESS = "${address}";`
    );

    fs.writeFileSync(seedPath, seedFile);

    console.log("SEED SCRIPT UPDATED");

    // 5. Seed votes
    console.log("SEEDING VOTES...");

    run(
      "cd blockchain && npx hardhat run scripts/seedVotes.js --network localhost"
    );

    console.log("STARTING BACKEND...");

    // 6. Start backend
    const backend = spawn("npm", ["run", "dev"], {
      cwd: "./backend",
      stdio: "inherit",
      shell: true,
    });

    await new Promise((res) => setTimeout(res, 3000));

    console.log("STARTING FRONTEND...");

    // 7. Start frontend
    const frontend = spawn("npm", ["run", "dev"], {
      cwd: "./frontend",
      stdio: "inherit",
      shell: true,
    });

    console.log("\nDEMO READY");
    console.log("Frontend: http://localhost:8080");
    console.log("Backend: http://localhost:5000/candidates");

  } catch (err) {
    console.error("ERROR:", err.message);
  }
})();