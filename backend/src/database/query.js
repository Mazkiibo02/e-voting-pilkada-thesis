const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../data/evoting.sqlite');
console.log('Opening database:', dbPath);
const db = new DatabaseSync(dbPath);

try {
  const users = db.prepare('SELECT id, name, email, role FROM users').all();
  console.log('Users in database:', users);
} catch (err) {
  console.error('Error querying users:', err);
} finally {
  db.close();
}
