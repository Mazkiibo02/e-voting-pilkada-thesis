import { ethers } from "ethers";
import path from "path";
import fs from "fs";

// DO NOT ALTER THIS VARIABLE MANUALLY OR REMOVE IT.
// The start-all.js script relies on the exact pattern "const CONTRACT_ADDRESS = ..." to update the deployed contract address.
const CONTRACT_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

const finalContractAddress = process.env.CONTRACT_ADDRESS || CONTRACT_ADDRESS;
const rpcUrl = process.env.HARDHAT_RPC_URL || "http://127.0.0.1:8545";

// connect ke local hardhat node
export const provider = new ethers.JsonRpcProvider(rpcUrl);

// load ABI dari artifacts
const artifactPath = path.join(
  __dirname,
  "../../../blockchain/artifacts/contracts/EVoting.sol/EVoting.json"
);

const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

// Default Hardhat Account #0 private key
const defaultPrivateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY || defaultPrivateKey;

// wallet signer
export const wallet = new ethers.Wallet(privateKey, provider);

// gunakan wallet signer agar bisa submit transaksi anchorTpsResult
export const contract = new ethers.Contract(
  finalContractAddress,
  artifact.abi,
  wallet
);

export async function castVote(candidateId: number) {
  throw new Error("Voting disabled (use anchorTpsResult instead)");
}