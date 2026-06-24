const { spawn } = require("child_process");
const fs = require("fs");
const net = require("net");

function run(command, name) {
  const proc = spawn(command, {
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  proc.stdout.on("data", (data) => {
    const text = data.toString();
    process.stdout.write(`[${name}] ${text}`);

    if (name === "FRONTEND") {
      const match = text.match(/Local:\s+(http:\/\/localhost:\d+\/?)/);
      if (match) {
        console.log("\n[SYSTEM] Frontend is ready. Open:", match[1]);
      }
    }
  });

  proc.stderr.on("data", (data) => {
    process.stderr.write(`[${name} ERROR] ${data.toString()}`);
  });

  proc.on("exit", (code) => {
    if (code !== null && code !== 0) {
      console.error(`[${name}] exited with code ${code}`);
    }
  });

  return proc;
}

function waitForPort(port, host = "127.0.0.1", timeoutMs = 60000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    function check() {
      const socket = new net.Socket();

      socket.setTimeout(1000);

      socket.once("connect", () => {
        socket.destroy();
        resolve();
      });

      socket.once("timeout", () => {
        socket.destroy();
        retry();
      });

      socket.once("error", () => {
        socket.destroy();
        retry();
      });

      socket.connect(port, host);
    }

    function retry() {
      if (Date.now() - startedAt > timeoutMs) {
        reject(new Error(`Timed out waiting for ${host}:${port}`));
        return;
      }

      setTimeout(check, 1000);
    }

    check();
  });
}

function updateContractAddress(address) {
  const file = "./backend/src/services/blockchain.ts";

  if (!fs.existsSync(file)) {
    console.log("[WARN] backend/src/services/blockchain.ts not found");
    return;
  }

  const content = fs.readFileSync(file, "utf-8");

  const updated = content.replace(
    /const CONTRACT_ADDRESS = ".*?"/,
    `const CONTRACT_ADDRESS = "${address}"`
  );

  if (updated === content) {
    console.log("[WARN] CONTRACT_ADDRESS pattern not found in blockchain.ts");
    return;
  }

  fs.writeFileSync(file, updated);
  console.log("[SYSTEM] Backend contract address updated:", address);
}

function deployContract() {
  return new Promise((resolve, reject) => {
    console.log("[SYSTEM] Deploying contract...");

    const deploy = spawn(
      "cd blockchain && npx hardhat run scripts/deploy.js --network localhost",
      {
        shell: true,
        stdio: ["ignore", "pipe", "pipe"],
      }
    );

    let output = "";

    deploy.stdout.on("data", (data) => {
      const text = data.toString();
      output += text;
      process.stdout.write(`[DEPLOY] ${text}`);

      const match = output.match(
        /(?:EVoting deployed to:|deployed to:)\s*(0x[a-fA-F0-9]{40})/i
      );

      if (match) {
        resolve(match[1]);
      }
    });

    deploy.stderr.on("data", (data) => {
      const text = data.toString();
      output += text;
      process.stderr.write(`[DEPLOY ERROR] ${text}`);
    });

    deploy.on("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`Deploy failed with code ${code}`));
      }
    });
  });
}

async function main() {
  console.log("[SYSTEM] Starting system...");

  run("cd blockchain && npx hardhat node", "BLOCKCHAIN");

  console.log("[SYSTEM] Waiting for Hardhat node at 127.0.0.1:8545...");
  await waitForPort(8545, "127.0.0.1", 60000);
  console.log("[SYSTEM] Hardhat node is ready.");

  const address = await deployContract();
  console.log("[SYSTEM] Contract deployed:", address);

  updateContractAddress(address);

  console.log("[SYSTEM] Starting backend...");
  run("cd backend && npm run dev", "BACKEND");

  console.log("[SYSTEM] Starting frontend...");
  run("cd frontend && npm run dev", "FRONTEND");

  console.log("\n[SYSTEM] Services are starting.");
  console.log("[SYSTEM] Backend:  http://localhost:5000");
  console.log("[SYSTEM] Frontend URL will appear from Vite output.\n");
}

main().catch((error) => {
  console.error("[SYSTEM ERROR]", error.message);
  process.exit(1);
});