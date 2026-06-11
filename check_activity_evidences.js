const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'dev.db');
const db = new Database(dbPath, { readonly: true });

try {
  const activityId = 'cmqa1ylpy001jjcelwsjpkeky';
  const evidences = db.prepare("SELECT id, fileName, fileType, filePath, fileSize FROM Evidence WHERE activityId = ?").all(activityId);
  console.log('Evidences for activity:', evidences);
} catch (err) {
  console.error('Error:', err);
} finally {
  db.close();
}
