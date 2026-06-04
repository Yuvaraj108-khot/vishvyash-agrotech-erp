const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'server', 'src', 'routes');
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.ts'));

for (const file of files) {
    const filePath = path.join(routesDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix req.params properties to be cast as string
    content = content.replace(/req\.params\.([a-zA-Z0-9_]+)(?! as string)/g, "req.params.$1 as string");
    
    fs.writeFileSync(filePath, content);
}

const pdfPath = path.join(__dirname, 'server', 'src', 'utils', 'pdfGenerator.ts');
if (fs.existsSync(pdfPath)) {
    let pdfContent = fs.readFileSync(pdfPath, 'utf8');
    pdfContent = pdfContent.replace(/waitUntil:\s*['"]networkidle0['"]/g, "waitUntil: 'domcontentloaded'");
    fs.writeFileSync(pdfPath, pdfContent);
}
console.log("Done");
