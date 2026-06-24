import { Router, Response } from "express";
import { authenticateToken, requireRole, AuthRequest } from "../middleware/auth";
import db from "../database/connection";
import { contract, provider } from "../services/blockchain";
import { AuditLogsService } from "../services/auditLogs";
import { RecapsService } from "../services/recaps";
import { createHash } from "crypto";
import path from "path";
import fs from "fs";

const router = Router();

// Helper to restrict KPPS user access to their assigned TPS
const enforceTpsAccess = (req: AuthRequest, tpsId: number): boolean => {
  if (req.user?.role === "KPPS") {
    return req.user.assignedTpsId === tpsId;
  }
  return true; // ADMIN can access anything
};

/**
 * POST /finalization/tps/:tpsId
 * Purpose: Submit TPS final statistics, candidate pair totals, and document/audit log hashes to the smart contract.
 * Allowed roles: ADMIN, KPPS (assigned TPS only)
 */
router.post("/tps/:tpsId", authenticateToken, requireRole(["ADMIN", "KPPS"]), async (req: AuthRequest, res: Response) => {
  try {
    const tpsId = Number(req.params.tpsId);
    if (isNaN(tpsId)) {
      return res.status(400).json({ message: "Invalid TPS ID" });
    }

    if (!enforceTpsAccess(req, tpsId)) {
      return res.status(403).json({ message: "Access forbidden: KPPS cannot finalize other TPS" });
    }

    // 1. Fetch TPS metadata
    const tps = db.prepare("SELECT * FROM tps WHERE id = ?").get(tpsId) as any;
    if (!tps) {
      return res.status(404).json({ message: "TPS not found" });
    }

    if (tps.status === "BLOCKCHAIN_ANCHORED") {
      return res.status(400).json({ message: "TPS result has already been anchored to the blockchain." });
    }

    // Active status check (allow finalization only if recap exists and witness phase or recap generated phase is ready)
    const allowedStatuses = ["RECAP_GENERATED", "DOCUMENT_UPLOADED", "WITNESS_VERIFICATION", "FINALIZED"];
    if (!allowedStatuses.includes(tps.status)) {
      return res.status(400).json({
        message: `Cannot anchor result. TPS is in status: ${tps.status}. Recap must be generated or witness verification must be completed first.`
      });
    }

    const electionId = tps.election_id;

    // 2. Fetch recap data
    const recapResult = RecapsService.getByTpsId(tpsId);
    if (!recapResult) {
      return res.status(400).json({ message: "TPS recap has not been generated yet. Please generate recap first." });
    }

    if (recapResult.recap.validation_status !== "VALID") {
      return res.status(400).json({ message: `TPS recap validation status is ${recapResult.recap.validation_status}. Result must be VALID to anchor.` });
    }

    const { recap, candidateTotals } = recapResult;

    // Compile candidate totals arrays
    const candidatePairIds = candidateTotals.map(ct => BigInt(ct.candidatePairId));
    const voteTotals = candidateTotals.map(ct => BigInt(ct.voteTotal));

    // 3. Retrieve or calculate Document Hash
    const doc = db.prepare("SELECT * FROM documents WHERE tps_id = ? AND document_type = 'CHASIL_KWK_INSPIRED_RESULT_FORM'").get(tpsId) as any;
    let documentHash = "";

    if (doc) {
      if (doc.signed_file_hash_sha256) {
        documentHash = doc.signed_file_hash_sha256;
      } else if (doc.generated_pdf_path) {
        const absolutePath = path.resolve(__dirname, "../../", doc.generated_pdf_path);
        if (fs.existsSync(absolutePath)) {
          const fileBuffer = fs.readFileSync(absolutePath);
          documentHash = createHash("sha256").update(fileBuffer).digest("hex").toLowerCase();
        }
      }
    }

    if (!documentHash) {
      // Fallback
      documentHash = createHash("sha256").update(`chasil-fallback-${tpsId}`).digest("hex").toLowerCase();
    }

    // 4. Compute deterministic audit log hash
    const auditLogHash = AuditLogsService.generateTpsAuditHash(tpsId);

    // 5. Prevent database duplication check
    const existingRecord = db.prepare("SELECT id FROM blockchain_records WHERE election_id = ? AND tps_id = ?").get(electionId, tpsId);
    if (existingRecord) {
      return res.status(400).json({ message: "TPS result has already been anchored in the database record." });
    }

    console.log(`[BLOCKCHAIN] Submitting anchoring transaction for TPS ${tps.tps_number} (${tps.tps_code})...`);

    // 6. Submit to smart contract
    try {
      const tx = await contract.anchorTpsResult(
        BigInt(electionId),
        BigInt(tpsId),
        candidatePairIds,
        voteTotals,
        BigInt(recap.total_registered_voters),
        BigInt(recap.total_verified_voters),
        documentHash,
        auditLogHash
      );

      // Wait for block to be mined
      console.log(`[BLOCKCHAIN] Transaction submitted: ${tx.hash}. Waiting for block confirmation...`);
      const receipt = await tx.wait(1);
      const txHash = receipt.hash;
      const contractAddress = await contract.getAddress();
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);

      console.log(`[BLOCKCHAIN] Anchored successfully. Tx: ${txHash}`);

      // Write into database records
      try {
        db.exec("BEGIN TRANSACTION;");

        // Insert into blockchain_records
        db.prepare(`
          INSERT INTO blockchain_records (
            election_id, tps_id, recap_id, document_hash, audit_log_hash, 
            transaction_hash, contract_address, chain_id, finalized_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          electionId,
          tpsId,
          recap.id,
          documentHash,
          auditLogHash,
          txHash,
          contractAddress,
          chainId,
          new Date().toISOString()
        );

        // Update TPS status to BLOCKCHAIN_ANCHORED
        db.prepare(`
          UPDATE tps
          SET status = 'BLOCKCHAIN_ANCHORED', updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(tpsId);

        db.exec("COMMIT;");
      } catch (dbErr) {
        try {
          db.exec("ROLLBACK;");
        } catch (rollbackErr) {
          // ignore
        }
        console.error("Database transaction error after successful blockchain anchor:", dbErr);
        // Note: Even if SQLite fails to write, the transaction has already been mined on the blockchain.
        throw dbErr;
      }

      // Log status update to audit_logs
      AuditLogsService.log({
        electionId,
        tpsId,
        actorUserId: req.user?.sub ? Number(req.user.sub) : null,
        actorRole: req.user?.role || null,
        action: "TPS_STATUS_UPDATED",
        entityType: "TPS",
        entityId: tpsId,
        description: `TPS status updated to BLOCKCHAIN_ANCHORED (transaction hash: ${txHash})`,
        metadataJson: {
          status: "BLOCKCHAIN_ANCHORED",
          transactionHash: txHash,
          documentHash,
          auditLogHash
        }
      });

      return res.status(200).json({
        message: "TPS result successfully anchored to blockchain",
        data: {
          electionId,
          tpsId,
          transactionHash: txHash,
          contractAddress,
          chainId,
          documentHash,
          auditLogHash
        }
      });
    } catch (contractErr: any) {
      console.error("Failed to execute contract transaction:", contractErr);
      return res.status(500).json({
        message: "Transaction execution on blockchain failed.",
        error: contractErr.message || String(contractErr)
      });
    }
  } catch (error: any) {
    console.error("Error during TPS anchoring finalization:", error);
    return res.status(500).json({ message: "An unexpected error occurred during blockchain anchoring." });
  }
});

export default router;
