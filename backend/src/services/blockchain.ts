import { ethers } from "ethers";
import path from "path";
import fs from "fs";

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// connect ke local hardhat node
const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

// gunakan private key account #0 dari hardhat node
const PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// load ABI dari artifacts
const artifactPath = path.join(
  __dirname,
  "../../../blockchain/artifacts/contracts/EVoting.sol/EVoting.json"
);

const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

export const contract = new ethers.Contract(
  CONTRACT_ADDRESS,
  artifact.abi,
  wallet
);

export async function castVote(candidateId: number) {
  const tx = await contract.castVote(candidateId);
  await tx.wait(); // tunggu sampai mined
};