import "dotenv/config";
import db from "../src/database/connection";
import { createAuthToken } from "../src/services/auth";
import { AuditLogsService } from "../src/services/auditLogs";

async function runAuditTests() {
  const port = process.env.PORT || 5000;
  const baseUrl = `http://localhost:${port}`;

  console.log("==================================================");
  console.log("STARTING AUDIT TRAIL INTEGRATION TESTS...");
  console.log("==================================================");

  try {
    // 0. Reset/Clear audit logs to have a clean slate for the test
    db.prepare("DELETE FROM audit_logs").run();
    console.log("Cleared existing audit logs.");

    const adminUser = db.prepare("SELECT id FROM users WHERE email = 'admin@example.local'").get() as { id: number } | undefined;
    if (!adminUser) {
      throw new Error("Admin user 'admin@example.local' not found in database.");
    }
    const adminToken = createAuthToken({ sub: String(adminUser.id), role: "ADMIN", assignedTpsId: null });
    
    // Find election, TPS, candidate, and voter IDs
    const tpsList = db.prepare("SELECT * FROM tps ORDER BY id ASC").all() as any[];
    if (tpsList.length === 0) {
      throw new Error("No TPS found. Make sure the database is seeded.");
    }
    const tpsId = tpsList[0].id;
    const electionId = tpsList[0].election_id;

    // Reset TPS status to DRAFT so we can perform the flow
    db.prepare("UPDATE tps SET status = 'DRAFT' WHERE id = ?").run(tpsId);

    const voter = db.prepare("SELECT id FROM voters WHERE tps_id = ? LIMIT 1").get(tpsId) as any;
    if (!voter) {
      throw new Error("No voter found for TPS.");
    }
    const voterId = voter.id;
    // Reset voter has_voted to 0
    db.prepare("UPDATE voters SET has_voted = 0 WHERE id = ?").run(voterId);

    const candidate = db.prepare("SELECT id FROM candidate_pairs WHERE election_id = ? LIMIT 1").get(electionId) as any;
    if (!candidate) {
      throw new Error("No candidate pair found.");
    }
    const candidatePairId = candidate.id;

    console.log(`Test Parameters: Election ID ${electionId}, TPS ID ${tpsId}, Voter ID ${voterId}, Candidate Pair ID ${candidatePairId}`);

    // Action 1: AUTH_LOGIN
    console.log("Test 1: Testing login endpoint logging...");
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@example.local", password: "Admin123!" })
    });
    if (!loginRes.ok) {
      throw new Error(`Login failed: ${await loginRes.text()}`);
    }
    console.log("Login successful.");

    // Action 2: VOTING_SESSION_CREATED
    console.log("Test 2: Creating voting session...");
    // Make sure no active session exists for this voter
    db.prepare("DELETE FROM voting_sessions WHERE voter_id = ?").run(voterId);
    const sessionRes = await fetch(`${baseUrl}/voting-sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`
      },
      body: JSON.stringify({ electionId, tpsId, voterId, boothId: "booth-audit-test" })
    });
    if (!sessionRes.ok) {
      throw new Error(`Failed to create voting session: ${await sessionRes.text()}`);
    }
    const sessionData = (await sessionRes.json()) as any;
    const sessionId = sessionData.data.id;
    console.log(`Voting session created with ID: ${sessionId}`);

    // Update status to ACTIVE in case seed/expires setup put it elsewhere
    db.prepare("UPDATE voting_sessions SET status = 'ACTIVE' WHERE id = ?").run(sessionId);

    // Action 3: VOTE_CAST
    console.log("Test 3: Casting vote...");
    const castRes = await fetch(`${baseUrl}/votes/cast`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, candidatePairId })
    });
    if (!castRes.ok) {
      throw new Error(`Failed to cast vote: ${await castRes.text()}`);
    }
    console.log("Vote cast successful.");

    // Action 4: TPS_STATUS_UPDATED (CLOSING TPS)
    console.log("Test 4: Closing TPS...");
    const closeRes = await fetch(`${baseUrl}/tps/${tpsId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: "CLOSED" })
    });
    if (!closeRes.ok) {
      throw new Error(`Failed to close TPS: ${await closeRes.text()}`);
    }
    console.log("TPS closed successful.");

    // Action 5: TPS_RECAP_GENERATED
    console.log("Test 5: Generating TPS recap...");
    // Clear any existing recap for TPS
    const existingRecap = db.prepare("SELECT id FROM tps_recaps WHERE tps_id = ?").get(tpsId) as any;
    if (existingRecap) {
      db.prepare("DELETE FROM tps_recap_candidate_totals WHERE recap_id = ?").run(existingRecap.id);
      db.prepare("DELETE FROM tps_recaps WHERE id = ?").run(existingRecap.id);
    }
    const recapRes = await fetch(`${baseUrl}/recaps/tps/${tpsId}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`
      }
    });
    if (!recapRes.ok) {
      throw new Error(`Failed to generate recap: ${await recapRes.text()}`);
    }
    console.log("Recap generated successful.");

    // Action 6: CHASIL_GENERATED
    console.log("Test 6: Generating C.Hasil document...");
    // Clear existing document metadata
    db.prepare("DELETE FROM documents WHERE tps_id = ?").run(tpsId);
    const docRes = await fetch(`${baseUrl}/documents/tps/${tpsId}/chasil/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`
      }
    });
    if (!docRes.ok) {
      throw new Error(`Failed to generate C.Hasil: ${await docRes.text()}`);
    }
    const docData = (await docRes.json()) as any;
    const documentId = docData.data.id;
    console.log(`C.Hasil document generated with ID: ${documentId}`);

    // Action 7: SIGNED_FORM_UPLOADED
    console.log("Test 7: Uploading signed C.Hasil file...");
    const dummyPngBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
      "base64"
    );
    const uploadRes = await uploadMultipart(baseUrl, documentId, adminToken, "signed-form.png", "image/png", dummyPngBuffer);
    if (uploadRes.status !== 200) {
      throw new Error(`Failed to upload signed form: ${uploadRes.body}`);
    }
    console.log("Signed form uploaded successfully.");

    // Action 8: VOTING_SESSION_CANCELLED (Create a new session and cancel it)
    console.log("Test 8: Creating and cancelling a voting session...");
    // Reset voter again to allow another session creation
    db.prepare("UPDATE voters SET has_voted = 0 WHERE id = ?").run(voterId);
    const tempSessionRes = await fetch(`${baseUrl}/voting-sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`
      },
      body: JSON.stringify({ electionId, tpsId, voterId, boothId: "booth-audit-test-2" })
    });
    if (!tempSessionRes.ok) {
      throw new Error(`Failed to create second voting session: ${await tempSessionRes.text()}`);
    }
    const tempSessionData = (await tempSessionRes.json()) as any;
    const tempSessionId = tempSessionData.data.id;
    
    const cancelRes = await fetch(`${baseUrl}/voting-sessions/${tempSessionId}/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`
      }
    });
    if (!cancelRes.ok) {
      throw new Error(`Failed to cancel voting session: ${await cancelRes.text()}`);
    }
    console.log("Voting session cancelled successfully.");

    // Verify Audit Logs via GET /audit-logs endpoint
    console.log("\nTest 9: Retrieving and verifying audit logs via API...");
    const auditRes = await fetch(`${baseUrl}/audit-logs`, {
      headers: { "Authorization": `Bearer ${adminToken}` }
    });
    if (!auditRes.ok) {
      throw new Error(`Failed to fetch audit logs: ${await auditRes.text()}`);
    }
    const auditData = (await auditRes.json()) as any;
    const logs = auditData.items;

    console.log(`Retrieved ${logs.length} audit log entries from API.`);

    const actionsToVerify = [
      "AUTH_LOGIN",
      "VOTING_SESSION_CREATED",
      "VOTE_CAST",
      "TPS_STATUS_UPDATED",
      "TPS_RECAP_GENERATED",
      "CHASIL_GENERATED",
      "SIGNED_FORM_UPLOADED",
      "VOTING_SESSION_CANCELLED"
    ];

    console.log("\nDetailed log entries recorded:");
    for (const log of logs) {
      console.log(`- [${log.created_at}] Action: ${log.action} | Actor: ${log.actor_email || 'Voter'} | Role: ${log.actor_role} | Description: ${log.description}`);
    }

    const missingActions = [];
    for (const action of actionsToVerify) {
      const found = logs.find((l: any) => l.action === action);
      if (!found) {
        missingActions.push(action);
      }
    }

    if (missingActions.length > 0) {
      throw new Error(`Missing expected audit log actions: ${missingActions.join(", ")}`);
    }

    console.log("\n==================================================");
    console.log("ALL AUDIT LOG ACTIONS SUCCESSFULLY VERIFIED!");
    console.log("==================================================");
    process.exit(0);

  } catch (err) {
    console.error("\n==================================================");
    console.error("AUDIT TRAIL INTEGRATION TESTS FAILED!");
    console.error(err);
    console.error("==================================================");
    process.exit(1);
  }
}

async function uploadMultipart(
  baseUrl: string,
  documentId: number,
  token: string,
  filename: string,
  mimetype: string,
  fileBuffer: Buffer
): Promise<{ status: number; body: string }> {
  const boundary = "----TestBoundary" + Math.random().toString(36).substring(2);
  const header = 
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="signedForm"; filename="${filename}"\r\n` +
    `Content-Type: ${mimetype}\r\n\r\n`;
  const footer = `\r\n--${boundary}--\r\n`;

  const payload = Buffer.concat([
    Buffer.from(header, "utf-8"),
    fileBuffer,
    Buffer.from(footer, "utf-8")
  ]);

  const res = await fetch(`${baseUrl}/documents/${documentId}/signed-upload`, {
    method: "POST",
    headers: {
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
      "Authorization": `Bearer ${token}`
    },
    body: payload
  });

  return {
    status: res.status,
    body: await res.text()
  };
}

runAuditTests();
