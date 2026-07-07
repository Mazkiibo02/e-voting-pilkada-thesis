import db from "./connection";
import { RecapsService } from "../services/recaps";
import { DocumentsService } from "../services/documents";

function closeAllTpsAndGenerateRecaps() {
  try {
    const tpsList = db.prepare("SELECT * FROM tps").all() as any[];
    console.log(`Found ${tpsList.length} TPS. Starting close and recap process...`);

    // Use actual Admin user ID 28
    const adminUserId = 28;

    for (const tps of tpsList) {
      console.log(`\n========================================`);
      console.log(`Processing TPS ${tps.tps_number} (${tps.tps_code}) [ID: ${tps.id}]`);
      console.log(`Current status: ${tps.status}`);

      // 1. Update TPS status to CLOSED if it is OPEN or DRAFT
      if (tps.status === "OPEN" || tps.status === "DRAFT" || tps.status === "RECAP_GENERATED") {
        db.prepare("UPDATE tps SET status = 'CLOSED', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(tps.id);
        console.log(`- Status updated to CLOSED.`);
      }

      // 2. Generate TPS Recap
      try {
        const result = RecapsService.generateRecap(tps.id, adminUserId);
        console.log(`- Recap generated successfully!`);
        console.log(`  Validation status: ${result.recap.validation_status}`);
        console.log(`  Total Registered: ${result.recap.total_registered_voters}`);
        console.log(`  Total Verified: ${result.recap.total_verified_voters}`);
        console.log(`  Total Valid Votes: ${result.recap.total_valid_votes}`);

        // 3. Generate Document
        if (result.recap.validation_status === "VALID") {
          const doc = DocumentsService.generateForm(tps.id);
          console.log(`- Document generated successfully! [ID: ${doc.id}]`);
          console.log(`  Document status: ${doc.status}`);
        } else {
          console.warn(`- Recap validation failed: ${JSON.stringify(result.issues)}`);
        }
      } catch (err: any) {
        console.error(`- Error generating recap/document:`, err.message);
      }
    }

    console.log(`\n========================================`);
    console.log("Process completed successfully!");
  } catch (error) {
    console.error("Execution failed:", error);
  }
}

closeAllTpsAndGenerateRecaps();
