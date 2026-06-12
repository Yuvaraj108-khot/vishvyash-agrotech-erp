import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const pdfPath = path.join(__dirname, '../downloaded_prod_0003.pdf');

async function main() {
  console.log("Installing pdf-parse...");
  execSync('"C:\\Program Files\\nodejs\\npm.cmd" install pdf-parse --no-save', { cwd: __dirname });
  
  const pdfParse = require('pdf-parse');
  const buffer = fs.readFileSync(pdfPath);
  
  const data = await pdfParse(buffer);
  console.log("=== PDF TEXT EXTRACTED ===");
  console.log(data.text);
  console.log("=== END ===");
  console.log("Contains 'Consignee':", data.text.includes('Consignee'));
  console.log("Contains 'Ship To':", data.text.includes('Ship To'));
}

main().catch(console.error);
