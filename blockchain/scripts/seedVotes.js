const { ethers } = require("hardhat");

async function main() {
    const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

    const EVoting = await ethers.getContractFactory("EVoting");
    const voting = await EVoting.attach(CONTRACT_ADDRESS);

    console.log("SEEDING VOTES...");

    await (await voting.castVote(1, 1)).wait();
    await (await voting.castVote(1, 1)).wait();
    await (await voting.castVote(1, 2)).wait();
    await (await voting.castVote(2, 3)).wait();
    await (await voting.castVote(2, 3)).wait();

    console.log("DONE SEEDING");
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});