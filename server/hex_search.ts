import fs from 'fs';
import path from 'path';

const pdf1Path = path.join(__dirname, 'storage/pdfs/VISH_2026-27_001.pdf');
const pdf2Path = path.join(__dirname, 'storage/pdfs/VISH_2026-27_002.pdf');

function checkWordInPdf(pdfPath: string, word: string, name: string) {
  if (!fs.existsSync(pdfPath)) {
    console.log(`${name} not found`);
    return;
  }
  const buffer = fs.readFileSync(pdfPath);
  
  // Convert word to 8-bit hex representation
  const hex8 = Buffer.from(word, 'ascii').toString('hex');
  // Convert word to UTF-16BE hex representation
  const hex16 = Buffer.from(word, 'utf16le');
  // Swap bytes for big-endian
  for (let i = 0; i < hex16.length; i += 2) {
    const tmp = hex16[i];
    hex16[i] = hex16[i+1];
    hex16[i+1] = tmp;
  }
  const hex16Str = hex16.toString('hex');

  const has8 = buffer.toString('hex').includes(hex8);
  const has16 = buffer.toString('hex').includes(hex16Str);

  console.log(`[${name}] Word "${word}" -> 8bit hex: ${hex8} (Found: ${has8}), 16bit hex: ${hex16Str} (Found: ${has16})`);
}

console.log("=== CHECKING CASE 1 (TEMPLATE A) ===");
checkWordInPdf(pdf1Path, "Mahindra", "Case 1");
checkWordInPdf(pdf1Path, "Consignee", "Case 1");
checkWordInPdf(pdf1Path, "Ship To", "Case 1");

console.log("=== CHECKING CASE 2 (TEMPLATE B) ===");
checkWordInPdf(pdf2Path, "Karnataka", "Case 2");
checkWordInPdf(pdf2Path, "Consignee", "Case 2");
checkWordInPdf(pdf2Path, "Ship To", "Case 2");
