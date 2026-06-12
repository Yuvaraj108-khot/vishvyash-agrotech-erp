import fs from 'fs';
import path from 'path';

const pdfPath = path.join(__dirname, 'storage/pdfs/VISH_2026-27_001.pdf');

if (fs.existsSync(pdfPath)) {
  const buffer = fs.readFileSync(pdfPath);
  console.log("PDF File size:", buffer.length);
  // Print first 1000 characters of the PDF file
  console.log("=== HEAD ===");
  console.log(buffer.toString('ascii', 0, 1000));
  // Print last 1000 characters of the PDF file
  console.log("=== TAIL ===");
  console.log(buffer.toString('ascii', buffer.length - 1000));
} else {
  console.log("File not found");
}
