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

  return proc;
}

(async () => {
  console.log("🚀 Starting system...");

  // 1️⃣ Start blockchain node
  const node = run("cd blockchain && npx hardhat node", "BLOCKCHAIN");

  // 2️⃣ Tunggu node ready
  setTimeout(() => {
    console.log("🚀 Deploying contract...");

    const deploy = exec(
      "cd blockchain && npx hardhat run scripts/deploy.js --network localhost"
    );

    deploy.stdout.on("data", (data) => {
      console.log(`[DEPLOY] ${data}`);

      // 3️⃣ Ambil contract address
      if (data.includes("EVoting deployed to:")) {
        const address = data.split("EVoting deployed to:")[1].trim();

        console.log("📌 CONTRACT:", address);

        // 4️⃣ Update backend otomatis
        const file = "./backend/src/services/blockchain.ts";

        if (fs.existsSync(file)) {
          let content = fs.readFileSync(file, "utf-8");

          content = content.replace(
            /const CONTRACT_ADDRESS = ".*?"/,
            `const CONTRACT_ADDRESS = "${address}"`
          );

          fs.writeFileSync(file, content);
          console.log("✅ Backend updated!");
        } else {
          console.log("⚠️ File blockchain.ts tidak ditemukan");
        }

        // 5️⃣ Start backend
        run("cd backend && npm run dev", "BACKEND");

        // 6️⃣ Start frontend
        run("cd frontend && npm run dev", "FRONTEND");
      }
    });
  }, 6000); // kasih waktu node startup
})();