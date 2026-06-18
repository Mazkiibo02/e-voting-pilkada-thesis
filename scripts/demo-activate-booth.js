/**
 * Local E-Voting Demo Helper Script
 * 
 * This script automates the KPPS/Admin booth activation process for demo purposes.
 * It logs in, finds the first unvoted voter, cancels any stale active sessions for
 * the target booth, and creates a new temporary voting session.
 * 
 * Usage:
 *   node scripts/demo-activate-booth.js
 * 
 * Overrides:
 *   BACKEND_URL=http://localhost:5000 BOOTH_ID=BOOTH-01 node scripts/demo-activate-booth.js
 */

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";
const BOOTH_ID = process.env.BOOTH_ID || "BOOTH-01";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@example.local";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin123!";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:8081";

async function main() {
  console.log("==================================================");
  console.log("🚀 Starting Local Demo Booth Activation...");
  console.log(`Backend URL:  ${BACKEND_URL}`);
  console.log(`Booth ID:     ${BOOTH_ID}`);
  console.log(`Admin User:   ${ADMIN_EMAIL}`);
  console.log("==================================================");

  try {
    // 1. Login as Admin
    console.log("🔑 Logging in as Admin...");
    const loginRes = await fetch(`${BACKEND_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });

    if (!loginRes.ok) {
      const errText = await loginRes.text();
      throw new Error(`Login failed (${loginRes.status}): ${errText}`);
    }

    const { token } = await loginRes.json();
    console.log("✅ Logged in successfully.");

    // 2. Retrieve Voters
    console.log("📋 Fetching voters...");
    const votersRes = await fetch(`${BACKEND_URL}/voters`, {
      headers: { "Authorization": `Bearer ${token}` },
    });

    if (!votersRes.ok) {
      const errText = await votersRes.text();
      throw new Error(`Failed to fetch voters: ${errText}`);
    }

    const { items: voters } = await votersRes.json();
    if (!voters || voters.length === 0) {
      throw new Error("No voters found in the database. Please seed the database first.");
    }

    // 3. Select the first voter who has not voted
    const voter = voters.find(v => v.has_voted === 0 && v.tps_id !== null);
    if (!voter) {
      throw new Error("No unvoted voters with an assigned TPS ID were found.");
    }

    console.log(`👉 Selected Voter: ${voter.name} (Code: ${voter.voter_code}, ID: ${voter.id})`);
    console.log(`📍 TPS ID: ${voter.tps_id}`);

    // 4. Cancel stale ACTIVE voting sessions for the same booth
    console.log(`🔍 Checking for active sessions on booth ${BOOTH_ID}...`);
    const sessionsRes = await fetch(
      `${BACKEND_URL}/voting-sessions?boothId=${encodeURIComponent(BOOTH_ID)}&status=ACTIVE`,
      {
        headers: { "Authorization": `Bearer ${token}` },
      }
    );

    if (sessionsRes.ok) {
      const { items: sessions } = await sessionsRes.json();
      if (sessions && sessions.length > 0) {
        console.log(`⚠️ Found ${sessions.length} active session(s) on booth ${BOOTH_ID}. Cancelling them...`);
        for (const session of sessions) {
          const cancelRes = await fetch(`${BACKEND_URL}/voting-sessions/${session.id}/cancel`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` },
          });
          if (cancelRes.ok) {
            console.log(`   - Cancelled session ID: ${session.id}`);
          } else {
            console.warn(`   - Failed to cancel session ID: ${session.id}`);
          }
        }
      } else {
        console.log("   - No active sessions found.");
      }
    } else {
      console.warn("⚠️ Could not retrieve active sessions; skipping cancellation step.");
    }

    // 5. Create a temporary voting session
    console.log(`🆕 Creating new voting session for booth ${BOOTH_ID}...`);
    const createRes = await fetch(`${BACKEND_URL}/voting-sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        electionId: voter.election_id,
        tpsId: voter.tps_id,
        voterId: voter.id,
        boothId: BOOTH_ID,
      }),
    });

    if (!createRes.ok) {
      const errBody = await createRes.json().catch(() => ({}));
      throw new Error(`Failed to create voting session: ${errBody.message || createRes.statusText}`);
    }

    const { data: sessionData } = await createRes.json();

    // 6. Print success info
    const boothUrl = `${FRONTEND_URL}/booth/${encodeURIComponent(BOOTH_ID)}`;
    console.log("\n==================================================");
    console.log("🎉 SUCCESS: VOTING BOOTH ACTIVATED!");
    console.log("==================================================");
    console.log(`Voter Name:  ${voter.name}`);
    console.log(`Voter ID:    ${voter.id}`);
    console.log(`TPS ID:      ${voter.tps_id}`);
    console.log(`Booth ID:    ${BOOTH_ID}`);
    console.log(`Session ID:  ${sessionData.id}`);
    console.log(`Expires At:  ${sessionData.expiresAt}`);
    console.log(`Status:      ${sessionData.status}`);
    console.log("--------------------------------------------------");
    console.log(`🔗 Booth URL: ${boothUrl}`);
    console.log("==================================================\n");

  } catch (error) {
    console.error("\n❌ ERROR during booth activation:", error.message);
    process.exit(1);
  }
}

main();
