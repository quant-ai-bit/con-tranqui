const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'dev.db');
console.log('Opening database at:', dbPath);

try {
  const db = new Database(dbPath, { readonly: true });
  
  // List tables
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('Tables:', tables.map(t => t.name).join(', '));
  
  // Check Users
  const users = db.prepare("SELECT id, email, name, role FROM User").all();
  console.log('\nUsers:', users);
  
  // Check Contracts
  const contracts = db.prepare("SELECT id, title, contractNumber, entity FROM Contract").all();
  console.log('\nContracts:', contracts);
  
  // Check Scopes
  const scopesCount = db.prepare("SELECT COUNT(*) as count FROM Scope").get();
  console.log('\nScopes count:', scopesCount.count);
  
  if (contracts.length > 0) {
    const tourismContract = contracts.find(c => c.contractNumber === '3227') || contracts[0];
    console.log('Using Contract:', tourismContract.title, tourismContract.id);
    const scopes = db.prepare("SELECT id, orderNumber, title FROM Scope WHERE contractId = ?").all(tourismContract.id);
    console.log('\nScopes:', scopes);
    
    for (const scope of scopes) {
      const entries = db.prepare("SELECT id, month, year, status, narrativeText FROM ScopeEntry WHERE scopeId = ?").all(scope.id);
      console.log(`\nScope ${scope.orderNumber} entries:`, entries);
      
      const evidences = db.prepare("SELECT id, fileName, filePath, month, year FROM Evidence WHERE scopeId = ?").all(scope.id);
      console.log(`Scope ${scope.orderNumber} evidences:`, evidences);
    }
    
    const reports = db.prepare("SELECT id, month, year, status, filePath FROM Report WHERE contractId = ?").all(tourismContract.id);
    console.log('\nReports:', reports);
  }
  
  db.close();
} catch (err) {
  console.error('Error reading database:', err);
}
