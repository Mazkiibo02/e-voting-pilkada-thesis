import db from '../src/database/connection';

try {
  db.exec('ALTER TABLE tps ADD COLUMN male_dpt INTEGER DEFAULT 0');
  db.exec('ALTER TABLE tps ADD COLUMN female_dpt INTEGER DEFAULT 0');
  db.exec('ALTER TABLE tps ADD COLUMN opened_at DATETIME');
  db.exec('ALTER TABLE tps ADD COLUMN closed_at DATETIME');
  db.exec('ALTER TABLE users ADD COLUMN device_id TEXT');
  db.exec('ALTER TABLE users ADD COLUMN public_key TEXT');
  console.log('Columns added successfully');
} catch(e: any) {
  console.error(e.message);
}
