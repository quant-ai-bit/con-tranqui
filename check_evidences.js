const fs = require('fs');
const path = require('path');

const evidencesDir = 'c:\\Users\\User\\Desktop\\ANTIGRAVITY\\con-tranqui\\EVIDENCIAS';

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walkDir(filePath));
    } else {
      results.push({
        relativePath: path.relative(evidencesDir, filePath),
        sizeBytes: stat.size,
        fileName: file
      });
    }
  });
  return results;
}

try {
  if (fs.existsSync(evidencesDir)) {
    const files = walkDir(evidencesDir);
    console.log(`Total files found: ${files.length}`);
    files.forEach(f => {
      console.log(`- ${f.relativePath} (${(f.sizeBytes / 1024).toFixed(1)} KB)`);
    });
  } else {
    console.log('Evidences directory does not exist at:', evidencesDir);
  }
} catch (err) {
  console.error('Error walking directory:', err);
}
