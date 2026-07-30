const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EVoting Smart Contract - Consensus Anchoring", function () {
  let evoting;
  let owner;
  let kppsSigner;
  let saksiSigner;

  beforeEach(async function () {
    [owner, kppsSigner, saksiSigner] = await ethers.getSigners();
    const EVotingFactory = await ethers.getContractFactory("EVoting");
    evoting = await EVotingFactory.deploy();
    await evoting.waitForDeployment();
  });

  it("should successfully anchor a final TPS result submitted by KPPS with Saksi consensus", async function () {
    const electionId = 1;
    const tpsId = 101;
    const candidatePairIds = [1, 2, 3];
    const voteTotals = [120, 95, 45];
    const totalRegisteredVoters = 300;
    const totalVerifiedVoters = 260;
    const documentHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    const auditLogHash = "a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e";

    // KPPS executes result anchoring transaction
    const tx = await evoting.connect(kppsSigner).anchorTpsResult(
      electionId,
      tpsId,
      candidatePairIds,
      voteTotals,
      totalRegisteredVoters,
      totalVerifiedVoters,
      documentHash,
      auditLogHash
    );
    await tx.wait();

    // Verify anchored record on-chain
    const record = await evoting.getTpsFinalRecord(electionId, tpsId);
    expect(record.electionId).to.equal(electionId);
    expect(record.tpsId).to.equal(tpsId);
    expect(record.totalRegisteredVoters).to.equal(totalRegisteredVoters);
    expect(record.totalVerifiedVoters).to.equal(totalVerifiedVoters);
    expect(record.documentHash).to.equal(documentHash);
    expect(record.auditLogHash).to.equal(auditLogHash);
    expect(record.finalizedAt).to.be.gt(0);
  });

  it("should reject duplicate finalization for the same TPS and election", async function () {
    const electionId = 1;
    const tpsId = 101;
    const candidatePairIds = [1, 2];
    const voteTotals = [50, 50];
    const documentHash = "hash1";
    const auditLogHash = "hash2";

    await evoting.anchorTpsResult(
      electionId,
      tpsId,
      candidatePairIds,
      voteTotals,
      100,
      100,
      documentHash,
      auditLogHash
    );

    // Re-anchoring the same TPS must revert
    await expect(
      evoting.anchorTpsResult(
        electionId,
        tpsId,
        candidatePairIds,
        voteTotals,
        100,
        100,
        documentHash,
        auditLogHash
      )
    ).to.be.revertedWith("TPS result already finalized for this election");
  });

  it("should reject mismatched candidate and vote total array lengths", async function () {
    await expect(
      evoting.anchorTpsResult(
        1,
        102,
        [1, 2, 3],
        [50, 50], // length mismatch
        100,
        100,
        "docHash",
        "auditHash"
      )
    ).to.be.revertedWith("Candidates and vote totals length mismatch");
  });
});
