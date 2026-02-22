async function main() {
  const EVoting = await ethers.getContractFactory("EVoting");
  const voting = await EVoting.deploy();

  await voting.waitForDeployment();

  console.log("EVoting deployed to:", await voting.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});