import fs from 'fs';
import path from 'path';

const pdf1Path = path.join(__dirname, 'storage/pdfs/VISH_2026-27_001.pdf');
const pdf2Path = path.join(__dirname, 'storage/pdfs/VISH_2026-27_002.pdf');

function extractPdfText(pdfPath: string): string {
  if (!fs.existsSync(pdfPath)) {
    return `[File Not Found: ${pdfPath}]`;
  }
  const buffer = fs.readFileSync(pdfPath);
  const pdfStr = buffer.toString('ascii');
  
  // Find all TJ and Tj instructions
  // Format is: [ <hex> num <hex> ... ] TJ or <hex> Tj
  const matches: string[] = [];
  
  // Simple regex to match hex blocks in Tj and TJ
  // Match Tj: <hex> Tj
  const tjRegex = /<([0-9a-fA-F]+)>\s*Tj/g;
  let match;
  while ((match = tjRegex.exec(pdfStr)) !== null) {
    matches.push(Buffer.from(match[1], 'hex').toString('ascii'));
  }

  // Match TJ: \[([^\]]+)\]\s*TJ/g
  const tjArrayRegex = /\[([^\]]+)\]\s*TJ/g;
  while ((match = tjArrayRegex.exec(pdfStr)) !== null) {
    const arrayContent = match[1];
    // extract all hex strings inside the array
    const hexRegex = /<([0-9a-fA-F]+)>/g;
    let hexMatch;
    let decodedWord = '';
    while ((hexMatch = hexRegex.exec(arrayContent)) !== null) {
      decodedWord += Buffer.from(hexMatch[1], 'hex').toString('ascii');
    }
    matches.push(decodedWord);
  }

  return matches.join('\n');
}

console.log("=== CASE 1 (TEMPLATE A) EXTRACTED TEXT ===");
console.log(extractPdfText(pdf1Path));

console.log("\n=== CASE 2 (TEMPLATE B) EXTRACTED TEXT ===");
console.log(extractPdfText(pdf2Path));
