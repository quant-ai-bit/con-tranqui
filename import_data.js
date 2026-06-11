const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, 'dev.db');
const evidencesDir = path.join(__dirname, '..', 'EVIDENCIAS');

// Simple unique ID generator similar to cuid
function generateId() {
  return 'imp_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

const activityTemplates = {
  1: [
    {
      folderName: "ANEXO 1 ALCANCE 1",
      title: "Reunión con Raul Murillo Gerente Ukumari y María Ceneida",
      date: "19 de febrero",
      location: "Ukumarí",
      purpose: "Se realizó una reunión público-privada con el gerente de Ukumari Raúl Murillo y la contratista María Ceneida Giraldo, con el propósito de tener un primer acercamiento oficial como encargado de la ruta de cerritos. Se habló de dos proyectos puntuales donde Ukumari podría participar como aliado estratégico los cuales fueron: las caminatas mensuales que se desarrollaran en los corredores de la ciudad y una posible ruta gastronómica en Cerritos que se propone desde la dirección de turismo. Se estableció como fecha tentativa el mes de mayo para realizar la caminata donde se hizo contacto telefónico con Marcela Londoño líder comercial para una próxima reunión donde se puedan generar vínculos de apoyo en los proyectos."
    },
    {
      folderName: "ANEXO 2 ALCANCE 1",
      title: "Elaboración y presentación del cronograma de actividades",
      date: "02 de febrero",
      location: "Oficina",
      purpose: "Se elaboró y presentó el cronograma mensual de actividades organizacionales para coordinar la gestión público-privada en territorio, facilitando el control y seguimiento de compromisos."
    }
  ],
  2: [
    {
      folderName: "ANEXO 1 ALCANCE 2",
      title: "Registro de actividades y caracterización",
      date: "10 de febrero",
      location: "Cerritos",
      purpose: "Se realizaron visitas técnicas y de caracterización a los prestadores de servicios turísticos del corredor de Cerritos utilizando el formulario digital oficial de la Alcaldía de Pereira."
    },
    {
      folderName: "ANEXO 2 ALCANCE 2",
      title: "Caracterización de prestadores de servicios turísticos",
      date: "12 de febrero",
      location: "Cerritos",
      purpose: "Se aplicó el formulario digital oficial de la Alcaldía de Pereira para clasificar los establecimientos en los rangos Plata, Oro y Diamante."
    }
  ],
  3: [
    {
      folderName: "ANEXO 1 ALCANCES 3",
      title: "Reunión de seguimiento con Sergio Moncada",
      date: "18 de febrero",
      location: "Reunión Virtual",
      purpose: "Se llevó a cabo el seguimiento y la identificación personalizada de cinco prestadores de servicios turísticos en Cerritos y se sostuvo una reunión virtual para socializar avances."
    }
  ],
  4: [
    {
      folderName: "ANEXO 1 ALCANCE 4",
      title: "Creación de la base de datos de prestadores turísticos",
      date: "22 de febrero",
      location: "Oficina",
      purpose: "Se realizó una actualización y consolidación permanente de la base de datos de prestadores turísticos caracterizados en la ruta de Cerritos."
    }
  ],
  5: [
    {
      folderName: "ANEXO 1 ALCANCE 5",
      title: "Presentación de informe ejecutivo semanal",
      date: "26 de febrero",
      location: "Oficina de Turismo",
      purpose: "Se asistió a las mesas de trabajo y comités mensuales liderados por Luz Adriana Montoya para reportar las caracterizaciones y se entregó el informe ejecutivo."
    }
  ],
  6: [
    {
      folderName: "ANEXO 1 ALCANCE 6",
      title: "Reunión de inducción con Luz Adriana Montoya",
      date: "03 de febrero",
      location: "Secretaría de Desarrollo",
      purpose: "Reunión con Luz Adriana y contratistas nuevos para inducción de actividades en las rutas turísticas."
    },
    {
      folderName: "ANEXO 2 ALCANCE 6",
      title: "Reunión de equipo sobre corredores turísticos",
      date: "06 de febrero",
      location: "Despacho de Turismo",
      purpose: "Reunión de articulación con el equipo de turismo para el seguimiento de corredores turísticos de Pereira."
    },
    {
      folderName: "ANEXO 3 ALCANCE 6",
      title: "Reunión de articulación para caminatas y ciclo paseos",
      date: "11 de febrero",
      location: "Secretaría de Cultura",
      purpose: "Reunión para planear y coordinar la logística de caminatas y ciclo paseos con la Secretaría de Cultura y Policía de Turismo."
    },
    {
      folderName: "ANEXO 4 ALCANCE 6",
      title: "Presentación del equipo de turismo ante la secretaria",
      date: "13 de febrero",
      location: "Salón de Reuniones",
      purpose: "Reunión general de presentación del equipo ante la secretaria de despacho Lizeth Cantillo."
    },
    {
      folderName: "ANEXO 5 ALCANCE 6",
      title: "Capacitación en el uso de la herramienta de caracterización",
      date: "17 de febrero",
      location: "Sala TIC",
      purpose: "Capacitación técnica sobre la herramienta digital de caracterización de prestadores turísticos."
    },
    {
      folderName: "ANEXO 6 ALCANCE 6",
      title: "Reunión de caminatas en las Rutas Turísticas",
      date: "20 de febrero",
      location: "Despacho de Turismo",
      purpose: "Coordinación y logística de las rutas y senderos turísticos seleccionados para caminatas."
    },
    {
      folderName: "ANEXO 7 ALCANCE 6",
      title: "Capacitación técnica en herramienta diagnóstica",
      date: "24 de febrero",
      location: "Sala TIC",
      purpose: "Capacitación complementaria sobre el procesamiento de datos y diagnósticos de la herramienta."
    }
  ],
  7: [
    {
      folderName: "ANEXO 1 ALCANCE 7",
      title: "Propuesta de actividades de activación turística en Cerritos",
      date: "28 de febrero",
      location: "Oficina",
      purpose: "Se elaboró una propuesta y lluvia de ideas inicial para el plan de actividades de activación mensual en el corredor turístico de Cerritos."
    }
  ]
};

function getFileType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext)) return 'image';
  if (['.mp3', '.wav', '.m4a', '.ogg'].includes(ext)) return 'audio';
  if (ext === '.pdf') return 'pdf';
  return 'document';
}

function walkDir(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walkDir(filePath));
    } else {
      results.push(filePath);
    }
  });
  return results;
}

async function run() {
  console.log('Starting data import with Activity-Centric structure...');
  const db = new Database(dbPath);

  try {
    // 1. Find the Contract
    const contract = db.prepare("SELECT * FROM Contract WHERE contractNumber = '3227' OR title LIKE '%Turismo%'").get();
    if (!contract) {
      console.error('Contract not found in DB.');
      return;
    }
    console.log(`Found Contract: ${contract.title} (ID: ${contract.id})`);

    // Get scopes for this contract
    const scopes = db.prepare("SELECT * FROM Scope WHERE contractId = ? ORDER BY orderNumber ASC").all(contract.id);
    console.log(`Found ${scopes.length} scopes.`);

    // Period for the evidences (February 2026, as per docx)
    const month = 2;
    const year = 2026;

    db.transaction(() => {
      // Clean existing activities, evidences and scope entries for this month
      for (const scope of scopes) {
        db.prepare("DELETE FROM Evidence WHERE scopeId = ? AND month = ? AND year = ?").run(scope.id, month, year);
        db.prepare("DELETE FROM Activity WHERE scopeId = ? AND month = ? AND year = ?").run(scope.id, month, year);
        db.prepare("DELETE FROM ScopeEntry WHERE scopeId = ? AND month = ? AND year = ?").run(scope.id, month, year);
      }
      console.log('Cleared previous activities, evidences, and entries for Feb 2026.');

      // Import for each scope
      for (const scope of scopes) {
        const alcanceNum = scope.orderNumber;
        const templates = activityTemplates[alcanceNum] || [];
        console.log(`\nProcessing Scope ${alcanceNum}: ${scope.title}`);

        const compiledNarrativeParts = [];

        for (const t of templates) {
          const activityId = generateId();
          console.log(`- Creating Activity: "${t.title}"`);

          // Insert Activity
          db.prepare(`
            INSERT INTO Activity (id, title, date, location, month, year, scopeId, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
          `).run(activityId, t.title, t.date, t.location, month, year, scope.id);

          // Add purpose text evidence
          const purposeEvidenceId = generateId();
          db.prepare(`
            INSERT INTO Evidence (id, fileName, fileType, filePath, month, year, scopeId, activityId, content, uploadedAt)
            VALUES (?, 'Propósito', 'text', '', ?, ?, ?, ?, ?, datetime('now'))
          `).run(purposeEvidenceId, month, year, scope.id, activityId, t.purpose);

          compiledNarrativeParts.push(`${t.title}: ${t.purpose}`);

          // Find physical files in EVIDENCIAS/ALCANCE X/[folderName]
          const scopeEvidencesDir = path.join(evidencesDir, `ALCANCE ${alcanceNum}`, t.folderName);
          const files = walkDir(scopeEvidencesDir);
          console.log(`  * Found ${files.length} physical files in ${t.folderName}`);

          for (const filePath of files) {
            const fileName = path.basename(filePath);
            
            // Skip files with "BORRAR" in name unless they are the only files
            if (files.length > 1 && fileName.toUpperCase().includes('BORRAR')) {
              console.log(`  * Skipping temp/trash file: ${fileName}`);
              continue;
            }

            const fileType = getFileType(fileName);
            const fileSize = fs.statSync(filePath).size;

            // Target directory in Next.js uploads
            const relativeUploadDir = path.join(scope.id, `${year}-${String(month).padStart(2, '0')}`);
            const targetDir = path.join(__dirname, 'uploads', relativeUploadDir);
            
            if (!fs.existsSync(targetDir)) {
              fs.mkdirSync(targetDir, { recursive: true });
            }

            const safeName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
            const targetPath = path.join(targetDir, safeName);

            // Copy physical file
            fs.copyFileSync(filePath, targetPath);

            // DB record path
            const dbFilePath = `/uploads/${scope.id}/${year}-${String(month).padStart(2, '0')}/${safeName}`;

            // Insert into Evidence table
            const evidenceId = generateId();
            db.prepare(`
              INSERT INTO Evidence (id, fileName, fileType, filePath, fileSize, month, year, scopeId, activityId, uploadedAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            `).run(evidenceId, fileName, fileType, dbFilePath, fileSize, month, year, scope.id, activityId);
            console.log(`    - Physical evidence imported: ${fileName} -> ${dbFilePath}`);
          }
        }

        // Backward compatibility: write a compiled ScopeEntry (Narrative)
        const narrativeText = compiledNarrativeParts.join('\n\n') || "Actividades realizadas correspondientes al periodo.";
        const entryId = generateId();
        db.prepare(`
          INSERT INTO ScopeEntry (id, month, year, narrativeText, status, aiMode, scopeId, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, 'confirmed', 'semi', ?, datetime('now'), datetime('now'))
        `).run(entryId, month, year, narrativeText, scope.id);
        console.log(`- Created ScopeEntry status 'confirmed' (Compiled fallback narrative)`);
      }
    })();

    console.log('\nImport completed successfully!');
  } catch (err) {
    console.error('Error during import transaction:', err);
  } finally {
    db.close();
  }
}

run();
