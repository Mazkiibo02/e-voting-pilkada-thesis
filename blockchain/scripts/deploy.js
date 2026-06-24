async function main() {
  const EVoting = await ethers.getContractFactory("EVoting");
  const voting = await EVoting.deploy();

  await voting.waitForDeployment();

  const address = await voting.getAddress();
  console.log("EVoting deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});