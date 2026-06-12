const fs = require('fs');
const path = require('path');

async function run() {
  try {
    const backendUrl = 'https://vishvyash-agrotech-erp.onrender.com';
    console.log(`Logging in to ${backendUrl}...`);
    const loginRes = await fetch(`${backendUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@vishvyash.com',
        password: 'Admin@123'
      })
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok) {
      console.error('Login failed:', loginData);
      return;
    }
    const token = loginData.token;
    console.log('Logged in successfully.');

    const targetInvoiceId = 'cmq20qt3u0002ey0jsjvho017'; // VAE/26-27/0003 (Template B)
    console.log(`Downloading PDF for invoice ${targetInvoiceId} from Render...`);

    const pdfRes = await fetch(`${backendUrl}/api/invoices/${targetInvoiceId}/pdf`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!pdfRes.ok) {
      const errText = await pdfRes.text();
      console.error('Failed to download PDF:', errText);
      return;
    }

    const arrayBuffer = await pdfRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const pdfPath = path.join(__dirname, 'downloaded_prod_0003.pdf');
    fs.writeFileSync(pdfPath, buffer);
    console.log(`Saved downloaded PDF to ${pdfPath}`);

    // Check if the downloaded PDF has text segments related to Consignee
    const pdfStr = buffer.toString('ascii');
    // Since the production PDF might be compressed, let's see if the word "Consignee" is in the text
    // Note: If compressed, it won't match, but let's check size
    console.log("PDF File Size:", buffer.length);
  } catch (error) {
    console.error('Error during test:', error);
  }
}

run();
