async function main() {
  const EVoting = await ethers.getContractFactory("EVoting");
  const voting = await EVoting.deploy();

  await voting.waitForDeployment();

  const address = await voting.getAddress();
  console.log("EVoting deployed to:", address);

  // Add sample candidates
  try {
    const candidates = ["Candidate A", "Candidate B", "Candidate C"];
    for (const name of candidates) {
      const tx = await voting.addCandidate(name);
      await tx.wait();
      console.log(`Added candidate: ${name}`);
    }
  } catch (error) {
    console.error("Error adding candidates:", error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});