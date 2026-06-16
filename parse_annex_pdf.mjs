import { createRequire } from "module";
import fs from "fs";

const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse");

async function run() {
  const pdfPath = "c:\\Users\\User\\Desktop\\ANTIGRAVITY\\con-tranqui\\EVIDENCIAS\\ALCANCE 1\\ANEXO 1 ALCANCE 1\\Reunión con Raul Murillo Gerente Ukumari y María Ceneida.pdf";
  console.log("Parsing PDF at:", pdfPath);
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    const parser = new PDFParse({ data: dataBuffer });
    const result = await parser.getText();
    console.log("Extracted Text:");
    console.log(result.text);
    await parser.destroy();
  } catch (error) {
    console.error("Error parsing PDF:", error);
  }
}

run();
