import fs from 'fs';
import path from 'path';

const pdf1Path = path.join(__dirname, 'storage/pdfs/VISH_2026-27_001.pdf');
const pdf2Path = path.join(__dirname, 'storage/pdfs/VISH_2026-27_002.pdf');

function check(pdfPath: string, name: string) {
  if (!fs.existsSync(pdfPath)) {
    console.error(`${name} PDF not found at: ${pdfPath}`);
    return;
  }
  const content = fs.readFileSync(pdfPath, 'utf8');
  console.log(`=== ${name} ===`);
  console.log("Contains 'Mahindra':", content.includes('Mahindra'));
  console.log("Contains 'Karnataka':", content.includes('Karnataka'));
  console.log("Contains 'State':", content.includes('State'));
}

check(pdf1Path, "Case 1 (Template A)");
check(pdf2Path, "Case 2 (Template B)");
