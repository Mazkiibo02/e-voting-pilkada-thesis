import db from '../src/database/connection';

try {
  // Update TPS 1
  db.exec("UPDATE tps SET male_dpt=49, female_dpt=52, registered_voters_total=101, tps_code='3376011001001', opened_at=CURRENT_TIMESTAMP WHERE tps_number='001'");
  // Update TPS 2
  db.exec("UPDATE tps SET male_dpt=55, female_dpt=60, registered_voters_total=115, tps_code='3376011002002', opened_at=CURRENT_TIMESTAMP WHERE tps_number='002'");
  // Update TPS 3
  db.exec("UPDATE tps SET male_dpt=45, female_dpt=50, registered_voters_total=95, tps_code='3376011003003', opened_at=CURRENT_TIMESTAMP WHERE tps_number='003'");
  
  console.log('TPS updated successfully');
} catch(e: any) {
  console.error(e.message);
}
