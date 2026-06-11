const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'dev.db');
console.log('Opening database at:', dbPath);

const replacements = [
  { search: /\bturistica\b/gi, replace: 'turística' },
  { search: /\bturisticas\b/gi, replace: 'turísticas' },
  { search: /\bturistico\b/gi, replace: 'turístico' },
  { search: /\bturisticos\b/gi, replace: 'turísticos' },
  { search: /\baccion\b/gi, replace: 'acción' },
  { search: /\bidentificacion\b/gi, replace: 'identificación' },
  { search: /\bejecucion\b/gi, replace: 'ejecución' },
  { search: /\bobligacion\b/gi, replace: 'obligación' },
  { search: /\breunion\b/gi, replace: 'reunión' },
  { search: /\breunio\b/gi, replace: 'reunió' },
  { search: /\breunieron\b/gi, replace: 'reunieron' },
  { search: /\brealizo\b/gi, replace: 'realizó' },
  { search: /\bapoyo\b/gi, replace: 'apoyó' },
  { search: /\bprogramo\b/gi, replace: 'programó' },
  { search: /\bplaneo\b/gi, replace: 'planeó' },
  { search: /\bcomite\b/gi, replace: 'comité' },
  { search: /\bpublico\b/gi, replace: 'público' },
  { search: /\bpublica\b/gi, replace: 'pública' },
  { search: /\bexito\b/gi, replace: 'éxito' },
  { search: /\bcoordinacion\b/gi, replace: 'coordinación' },
  { search: /\bsupervision\b/gi, replace: 'supervisión' },
  { search: /\bpresentacion\b/gi, replace: 'presentación' },
  { search: /\bsocializacion\b/gi, replace: 'socialización' },
  { search: /\bcaracterizacion\b/gi, replace: 'caracterización' },
  { search: /\belaboracion\b/gi, replace: 'elaboración' },
  { search: /\bconstruccion\b/gi, replace: 'construcción' },
  { search: /\bcapacitacion\b/gi, replace: 'capacitación' },
  { search: /\bdesarrollo\b/gi, replace: 'desarrollo' },
];

function applyReplacements(text) {
  if (!text) return text;
  let newText = text;
  replacements.forEach(({ search, replace }) => {
    // Preserve case where appropriate
    newText = newText.replace(search, (match) => {
      if (match[0] === match[0].toUpperCase()) {
        return replace[0].toUpperCase() + replace.slice(1);
      }
      return replace;
    });
  });
  return newText;
}

try {
  const db = new Database(dbPath);
  
  // 1. Update Evidence table
  const evidences = db.prepare("SELECT id, content, aiContent, originalContent, fileName FROM Evidence").all();
  console.log(`Checking ${evidences.length} evidences...`);
  
  let evidenceUpdates = 0;
  
  const updateEv = db.prepare("UPDATE Evidence SET content = ?, aiContent = ?, originalContent = ? WHERE id = ?");
  
  evidences.forEach((ev) => {
    let updated = false;
    let newContent = ev.content;
    let newAi = ev.aiContent;
    let newOrig = ev.originalContent;
    
    // Apply spelling replacements
    const replacedContent = applyReplacements(ev.content);
    const replacedAi = applyReplacements(ev.aiContent);
    const replacedOrig = applyReplacements(ev.originalContent);
    
    if (replacedContent !== ev.content) { newContent = replacedContent; updated = true; }
    if (replacedAi !== ev.aiContent) { newAi = replacedAi; updated = true; }
    if (replacedOrig !== ev.originalContent) { newOrig = replacedOrig; updated = true; }
    
    // For "Propósito" / "Proposito" files, let's also strip HTML tags from the content field
    if (ev.fileName && (ev.fileName.toLowerCase().includes('propósito') || ev.fileName.toLowerCase().includes('proposito'))) {
      if (newContent && (newContent.includes('<') || newContent.includes('&nbsp;'))) {
        // Strip HTML tags and entities
        let clean = newContent
          .replace(/&nbsp;/g, " ")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&amp;/g, "&")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/<[^>]*>/g, "")
          .replace(/\s+/g, " ")
          .trim();
        
        if (clean !== newContent) {
          newContent = clean;
          updated = true;
          console.log(`Stripped HTML from purpose Evidence ID ${ev.id}`);
        }
      }
    }
    
    if (updated) {
      updateEv.run(newContent, newAi, newOrig, ev.id);
      evidenceUpdates++;
    }
  });
  
  console.log(`Updated ${evidenceUpdates} Evidence records.`);
  
  // 2. Update ScopeEntry table
  const entries = db.prepare("SELECT id, narrativeText, observations FROM ScopeEntry").all();
  console.log(`Checking ${entries.length} scope entries...`);
  
  let entryUpdates = 0;
  const updateEntry = db.prepare("UPDATE ScopeEntry SET narrativeText = ?, observations = ? WHERE id = ?");
  
  entries.forEach((entry) => {
    let updated = false;
    let newNarrative = entry.narrativeText;
    let newObs = entry.observations;
    
    const replacedNarrative = applyReplacements(entry.narrativeText);
    const replacedObs = applyReplacements(entry.observations);
    
    if (replacedNarrative !== entry.narrativeText) { newNarrative = replacedNarrative; updated = true; }
    if (replacedObs !== entry.observations) { newObs = replacedObs; updated = true; }
    
    if (updated) {
      updateEntry.run(newNarrative, newObs, entry.id);
      entryUpdates++;
    }
  });
  
  console.log(`Updated ${entryUpdates} ScopeEntry records.`);
  
  db.close();
  console.log("Database cleanup completed successfully!");
} catch (err) {
  console.error("Error cleaning database:", err);
}
