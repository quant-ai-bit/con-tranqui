import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse");

console.log("PDFParse constructor:", PDFParse.toString());
console.log("PDFParse prototype:", Object.getOwnPropertyNames(PDFParse.prototype));
