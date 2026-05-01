import { ethers } from "ethers";
import path from "path";
import fs from "fs";

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// connect ke local hardhat node
const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

// load ABI dari artifacts
const artifactPath = path.join(
  __dirname,
  "../../../blockchain/artifacts/contracts/EVoting.sol/EVoting.json"
);

const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

// gunakan provider saja (TANPA wallet)
export const contract = new ethers.Contract(
  CONTRACT_ADDRESS,
  artifact.abi,
  provider
);

// OPTIONAL: kalau mau voting nanti
export async function castVote(candidateId: number) {
  throw new Error("Voting disabled sementara (no wallet)");
}