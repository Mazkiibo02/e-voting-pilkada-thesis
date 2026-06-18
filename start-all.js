const { exec } = require("child_process");
const fs = require("fs");

function run(command, name) {
  const proc = exec(command);

  proc.stdout.on("data", (data) => {
    console.log(`[${name}] ${data}`);
  });

  proc.stderr.on("data", (data) => {
    console.error(`[${name} ERROR] ${data}`);
  });

  proc.on("exit", (code) => {
    if (code !== null && code !== 0) {
      console.error(`[${name}] exited with code ${code}`);
    }
  });

  return proc;
}

function updateContractAddress(address) {
  const file = "./backend/src/services/blockchain.ts";

  if (!fs.existsSync(file)) {
    console.log("⚠️ File backend/src/services/blockchain.ts tidak ditemukan");
    return false;
  }

  let content = fs.readFileSync(file, "utf-8");

  const updated = content.replace(
    /const CONTRACT_ADDRESS = ".*?"/,
    `const CONTRACT_ADDRESS = "${address}"`
  );

  if (updated === content) {
    console.log("⚠️ CONTRACT_ADDRESS pattern tidak ditemukan di blockchain.ts");
    return false;
  }

  fs.writeFileSync(file, updated);
  console.log("✅ Backend contract address updated:", address);
  return true;
}

(async () => {
  console.log("🚀 Starting system...");

  run("cd blockchain && npx hardhat node", "BLOCKCHAIN");

  setTimeout(() => {
    console.log("🚀 Deploying contract...");

    const deploy = exec(
      "cd blockchain && npx hardhat run scripts/deploy.js --network localhost"
    );

    deploy.stdout.on("data", (data) => {
      console.log(`[DEPLOY] ${data}`);

      const match = data.match(/(?:EVoting deployed to:|deployed to:)\s*(0x[a-fA-F0-9]{40})/i);

      if (!match) {
        return;
      }

      const address = match[1];
      console.log("📌 CONTRACT:", address);

      updateContractAddress(address);

      console.log("🚀 Starting backend...");
      run("cd backend && npm run dev", "BACKEND");

      console.log("🚀 Starting frontend...");
      const frontendProc = run("cd frontend && npm run dev", "FRONTEND");

      frontendProc.stdout.on("data", (data) => {
        const match = data.toString().match(/Local:\s*(http:\/\/localhost:\d+)/i);
        if (match) {
          console.log(`\n🎉 [SYSTEM] Frontend is ready! Open: ${match[1]}\n`);
        }
      });

      console.log("\n✅ System starting. Open these URLs:");
      console.log("Backend:  http://localhost:5000");
      console.log("Frontend (default): http://localhost:8080 (Vite may auto-select another port if in use)\n");
    });

    deploy.stderr.on("data", (data) => {
      console.error(`[DEPLOY ERROR] ${data}`);
    });

    deploy.on("exit", (code) => {
      if (code !== 0) {
        console.error(`[DEPLOY] exited with code ${code}`);
      }
    });
  }, 8000);
})();