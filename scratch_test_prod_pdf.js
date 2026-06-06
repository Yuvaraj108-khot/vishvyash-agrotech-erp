const fs = require('fs');

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

    console.log('Fetching invoices...');
    const invoicesRes = await fetch(`${backendUrl}/api/invoices`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const invoicesData = await invoicesRes.json();
    const invoices = invoicesData.data || [];
    if (invoices.length === 0) {
      console.log('No invoices found.');
      return;
    }
    const targetInvoice = invoices[0];
    console.log(`Downloading PDF for invoice ${targetInvoice.invoiceNumber}...`);

    const pdfRes = await fetch(`${backendUrl}/api/invoices/${targetInvoice.id}/pdf`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!pdfRes.ok) {
      const errText = await pdfRes.text();
      console.error('Failed to download PDF:', errText);
      return;
    }

    const arrayBuffer = await pdfRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync('downloaded_prod_latest.pdf', buffer);
    console.log('Saved downloaded PDF to downloaded_prod_latest.pdf');
  } catch (error) {
    console.error('Error during test:', error);
  }
}

run();
