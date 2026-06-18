import "dotenv/config";
import db from "./database/connection";
import { createAuthToken } from "./services/auth";
import fs from "fs";
import path from "path";

async function runTests() {
  const port = process.env.PORT || 5000;
  const baseUrl = `http://localhost:${port}`;

  console.log("==================================================");
  console.log("STARTING SIGNED FORM UPLOAD INTEGRATION TESTS...");
  console.log("==================================================");

  try {
    // We will generate the authorization tokens directly since we have the connection
    const adminToken = createAuthToken({ sub: "1", role: "ADMIN", assignedTpsId: null });
    // Let's find TPS IDs
    const tpsList = db.prepare("SELECT * FROM tps ORDER BY id ASC").all() as any[];
    if (tpsList.length < 2) {
      throw new Error("Seeded TPS count is less than 2. Please reset database.");
    }
    const tpsId = tpsList[0].id;
    const otherTpsId = tpsList[1].id;
    const electionId = tpsList[0].election_id;

    // Get KPPS user for tpsId
    const kppsUser = db.prepare("SELECT id FROM users WHERE role = 'KPPS' AND assigned_tps_id = ?").get(tpsId) as any;
    const kppsToken = createAuthToken({ sub: String(kppsUser.id), role: "KPPS", assignedTpsId: tpsId });

    // Get WITNESS user
    const witnessUser = db.prepare("SELECT id FROM users WHERE role = 'WITNESS'").get() as any;
    const witnessToken = createAuthToken({ sub: String(witnessUser.id), role: "WITNESS", assignedTpsId: tpsId });

    // Get candidate pair
    const candidate = db.prepare("SELECT id FROM candidate_pairs WHERE election_id = ? LIMIT 1").get(electionId) as any;
    const candidatePairId = candidate.id;

    // Get voter in tpsId
    const voter = db.prepare("SELECT id FROM voters WHERE tps_id = ? LIMIT 1").get(tpsId) as any;
    const voterId = voter.id;

    console.log(`Using parameters: Election ID: ${electionId}, TPS ID: ${tpsId}, Voter ID: ${voterId}, Candidate Pair ID: ${candidatePairId}`);

    // Verify voter
    console.log("Step 1: Verifying voter...");
    const verifyRes = await fetch(`${baseUrl}/voters/${voterId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`
      },
      body: JSON.stringify({ verification_status: "VERIFIED" })
    });
    if (!verifyRes.ok) throw new Error(`Failed to verify voter: ${await verifyRes.text()}`);
    console.log("Voter verified successfully.");

    // Create voting session
    console.log("Step 2: Creating voting session...");
    const sessionRes = await fetch(`${baseUrl}/voting-sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`
      },
      body: JSON.stringify({ electionId, tpsId, voterId, boothId: "booth-test" })
    });
    if (!sessionRes.ok) throw new Error(`Failed to create voting session: ${await sessionRes.text()}`);
    const sessionData = (await sessionRes.json()) as any;
    const sessionId = sessionData.data.id;
    console.log(`Voting session created successfully with ID: ${sessionId}.`);

    // Cast vote
    console.log("Step 3: Casting vote...");
    const castRes = await fetch(`${baseUrl}/votes/cast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`
      },
      body: JSON.stringify({ sessionId, candidatePairId })
    });
    if (!castRes.ok) throw new Error(`Failed to cast vote: ${await castRes.text()}`);
    console.log("Vote cast successfully.");

    // Close TPS
    console.log("Step 4: Closing TPS...");
    const closeRes = await fetch(`${baseUrl}/tps/${tpsId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: "CLOSED" })
    });
    if (!closeRes.ok) throw new Error(`Failed to close TPS: ${await closeRes.text()}`);
    console.log("TPS status updated to CLOSED.");

    // Generate recap
    console.log("Step 5: Generating recap...");
    const recapRes = await fetch(`${baseUrl}/recaps/tps/${tpsId}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`
      }
    });
    if (!recapRes.ok) throw new Error(`Failed to generate recap: ${await recapRes.text()}`);
    console.log("Recap generated successfully.");

    // Generate C.Hasil document
    console.log("Step 6: Generating C.Hasil document form...");
    const docRes = await fetch(`${baseUrl}/documents/tps/${tpsId}/chasil/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`
      }
    });
    if (!docRes.ok) throw new Error(`Failed to generate C.Hasil: ${await docRes.text()}`);
    const docData = (await docRes.json()) as any;
    const documentId = docData.data.id;
    console.log(`C.Hasil document generated with ID: ${documentId}.`);

    // 1x1 transparent PNG pixel representation
    const dummyPngBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
      "base64"
    );

    // Test rejection: Unsupported file type (text file)
    console.log("Step 7: Testing unsupported file type upload rejection...");
    const txtRes = await uploadMultipart(baseUrl, documentId, adminToken, "test.txt", "text/plain", Buffer.from("hello world"));
    if (txtRes.status !== 400) {
      throw new Error(`Expected unsupported file type to return 400, but got ${txtRes.status}`);
    }
    console.log("Unsupported file type was successfully rejected with 400.");

    // Test rejection: Witness upload is rejected with 403
    console.log("Step 8: Testing WITNESS upload rejection...");
    const witnessRes = await uploadMultipart(baseUrl, documentId, witnessToken, "signed.png", "image/png", dummyPngBuffer);
    if (witnessRes.status !== 403) {
      throw new Error(`Expected witness upload to return 403, but got ${witnessRes.status}`);
    }
    console.log("Witness upload was successfully rejected with 403.");

    // Test rejection: KPPS from another TPS is rejected with 403
    // We will generate a KPPS token that is restricted to otherTpsId
    console.log("Step 9: Testing other TPS KPPS upload rejection...");
    const otherKppsToken = createAuthToken({ sub: "99", role: "KPPS", assignedTpsId: otherTpsId });
    const otherKppsRes = await uploadMultipart(baseUrl, documentId, otherKppsToken, "signed.png", "image/png", dummyPngBuffer);
    if (otherKppsRes.status !== 403) {
      throw new Error(`Expected other TPS KPPS upload to return 403, but got ${otherKppsRes.status}`);
    }
    console.log("Other TPS KPPS upload was successfully rejected with 403.");

    // Success upload: Admin uploads valid PNG
    console.log("Step 10: Uploading valid PNG signed form as ADMIN...");
    const uploadRes = await uploadMultipart(baseUrl, documentId, adminToken, "signed.png", "image/png", dummyPngBuffer);
    if (uploadRes.status !== 200) {
      throw new Error(`Expected upload to succeed (200), but got ${uploadRes.status}: ${uploadRes.body}`);
    }
    const uploadResult = JSON.parse(uploadRes.body);
    console.log("Upload response body:", JSON.stringify(uploadResult, null, 2));

    // Verify response includes SHA-256 hash and uploaded timestamp
    const signedFile = uploadResult.document.signedFile;
    if (!signedFile.sha256 || typeof signedFile.sha256 !== "string" || signedFile.sha256.length !== 64) {
      throw new Error("Response missing valid SHA-256 hash string.");
    }
    if (!signedFile.uploadedAt || isNaN(Date.parse(signedFile.uploadedAt))) {
      throw new Error("Response missing valid uploaded timestamp.");
    }
    console.log("SHA-256 hash and uploaded timestamp verified in upload response.");

    // Verify TPS status updates to DOCUMENT_UPLOADED
    console.log("Step 11: Verifying TPS status updated to DOCUMENT_UPLOADED...");
    const tpsVerifyRes = await fetch(`${baseUrl}/tps/${tpsId}`, {
      headers: { "Authorization": `Bearer ${adminToken}` }
    });
    const tpsData = (await tpsVerifyRes.json()) as any;
    if (tpsData.data.status !== "DOCUMENT_UPLOADED") {
      throw new Error(`Expected TPS status to be DOCUMENT_UPLOADED, but got ${tpsData.data.status}`);
    }
    console.log("TPS status verification passed.");

    // Verify signed-download works
    console.log("Step 12: Verifying signed-download endpoint...");
    const downloadRes = await fetch(`${baseUrl}/documents/${documentId}/signed-download`, {
      headers: { "Authorization": `Bearer ${adminToken}` }
    });
    if (!downloadRes.ok) {
      throw new Error(`Failed to download signed document: ${await downloadRes.text()}`);
    }
    const downloadBuffer = Buffer.from(await downloadRes.arrayBuffer());
    if (!downloadBuffer.equals(dummyPngBuffer)) {
      throw new Error("Downloaded file bytes do not match uploaded file bytes.");
    }
    console.log("Signed download verification passed.");

    // Verify signed-preview works
    console.log("Step 13: Verifying signed-preview endpoint...");
    const previewRes = await fetch(`${baseUrl}/documents/${documentId}/signed-preview`, {
      headers: { "Authorization": `Bearer ${adminToken}` }
    });
    if (!previewRes.ok) {
      throw new Error(`Failed to preview signed document: ${await previewRes.text()}`);
    }
    const previewMimetype = previewRes.headers.get("content-type");
    if (previewMimetype !== "image/png") {
      throw new Error(`Expected content-type to be image/png, but got ${previewMimetype}`);
    }
    console.log("Signed preview verification passed.");

    console.log("==================================================");
    console.log("INTEGRATION TESTS PASSED SUCCESSFULLY!");
    console.log("==================================================");
    process.exit(0);

  } catch (error: any) {
    console.error("==================================================");
    console.error("INTEGRATION TESTS FAILED!");
    console.error(error);
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

runTests();
