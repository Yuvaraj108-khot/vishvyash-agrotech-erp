import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create Admin User
  const hashedPassword = await bcrypt.hash('Admin@123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@vishvyash.com' },
    update: {},
    create: {
      email: 'admin@vishvyash.com',
      password: hashedPassword,
      name: 'Admin',
      role: 'ADMIN',
      phone: '+91 9876543210',
    },
  });
  console.log(`✅ Admin user created: ${admin.email}`);

  // Create Staff User
  const staffPassword = await bcrypt.hash('Staff@123', 12);
  const staff = await prisma.user.upsert({
    where: { email: 'staff@vishvyash.com' },
    update: {},
    create: {
      email: 'staff@vishvyash.com',
      password: staffPassword,
      name: 'Staff User',
      role: 'STAFF',
      phone: '+91 9876543211',
    },
  });
  console.log(`✅ Staff user created: ${staff.email}`);

  // Check if sample data already exists
  const clientCount = await prisma.client.count();
  if (clientCount > 0) {
    console.log('✅ Database already seeded with sample data. Skipping sample creation.');
    
    // Still ensure settings are up to date
    const settingsData = [
      { key: 'invoice_prefix', value: 'VAE/INV/' },
      { key: 'invoice_counter', value: '0' },
      { key: 'default_cgst_rate', value: '2.5' },
      { key: 'default_sgst_rate', value: '2.5' },
      { key: 'default_hsn_code', value: '4401' },
      { key: 'default_product', value: 'Biomass Briquettes' },
      { key: 'company_name', value: 'VISHVYASH AGROTECH ENERGY' },
      { key: 'company_gst', value: '27ABCFV1234A1Z5' },
      { key: 'company_pan', value: 'ABCFV1234A' },
      { key: 'company_state', value: 'Maharashtra' },
      { key: 'company_state_code', value: '27' },
      { key: 'company_address', value: 'Survey No. 57, At Post Borgaon (BK), Tal. Walwa, Dist. Sangli, Maharashtra - 415403' },
      { key: 'company_phone', value: '+91 9876543210' },
      { key: 'company_email', value: 'info@vishvyash.com' },
      { key: 'company_bank_name', value: 'State Bank of India' },
      { key: 'company_bank_account', value: '12345678901234' },
      { key: 'company_bank_ifsc', value: 'SBIN0001234' },
      { key: 'company_bank_branch', value: 'Walwa Branch' },
    ];

    await Promise.all(
      settingsData.map((setting) =>
        prisma.settings.upsert({
          where: { key: setting.key },
          update: {},
          create: setting,
        })
      )
    );
    console.log('✅ Settings ensured');
    console.log('🎉 Database seeded successfully!');
    return;
  }

  // Create Sample Clients
  const clients = await Promise.all([
    prisma.client.create({
      data: {
        name: 'Shree Cement Ltd.',
        gstNumber: '27AABCS1234A1Z5',
        address: 'Plot No. 45, MIDC Industrial Area, Kolhapur',
        city: 'Kolhapur',
        state: 'Maharashtra',
        pincode: '416005',
        phone: '+91 9988776655',
        email: 'purchase@shreecement.com',
        contactPerson: 'Mr. Rajesh Patil',
      },
    }),
    prisma.client.create({
      data: {
        name: 'Sangli Sugar Factory',
        gstNumber: '27AABSS5678B1Z3',
        address: 'Sugar Factory Road, Sangli',
        city: 'Sangli',
        state: 'Maharashtra',
        pincode: '416416',
        phone: '+91 9876512345',
        email: 'procurement@sanglisugar.com',
        contactPerson: 'Mr. Anil Deshmukh',
      },
    }),
    prisma.client.create({
      data: {
        name: 'Walchandnagar Industries',
        gstNumber: '27AABCW9012C1Z1',
        address: 'Walchandnagar, Pune',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '413114',
        phone: '+91 9823456789',
        email: 'info@walchandnagar.com',
        contactPerson: 'Mr. Sunil Jadhav',
      },
    }),
  ]);
  console.log(`✅ ${clients.length} clients created`);

  // Create Sample Drivers
  const drivers = await Promise.all([
    prisma.driver.create({
      data: {
        name: 'Ramesh Kamble',
        phone: '+91 9876001122',
        alternatePhone: '+91 9876001133',
        address: 'Walwa, Sangli',
        licenseNumber: 'MH10-2020-0012345',
        aadhaarNumber: '1234-5678-9012',
      },
    }),
    prisma.driver.create({
      data: {
        name: 'Suresh Shinde',
        phone: '+91 9876002233',
        address: 'Borgaon, Sangli',
        licenseNumber: 'MH10-2019-0098765',
        aadhaarNumber: '9876-5432-1098',
      },
    }),
    prisma.driver.create({
      data: {
        name: 'Ganesh Pawar',
        phone: '+91 9876003344',
        address: 'Vita, Sangli',
        licenseNumber: 'MH10-2021-0056789',
        aadhaarNumber: '5678-1234-9012',
      },
    }),
  ]);
  console.log(`✅ ${drivers.length} drivers created`);

  // Create Sample Vehicles
  const vehicles = await Promise.all([
    prisma.vehicle.create({
      data: {
        vehicleNumber: 'MH-10-AB-1234',
        vehicleType: 'Truck',
        ownerName: 'Vishvyash Agrotech Energy',
        driverId: drivers[0].id,
        insuranceExpiry: new Date('2026-12-31'),
        fitnessExpiry: new Date('2026-06-30'),
        permitExpiry: new Date('2027-03-31'),
      },
    }),
    prisma.vehicle.create({
      data: {
        vehicleNumber: 'MH-10-CD-5678',
        vehicleType: 'Tractor Trolley',
        ownerName: 'Vishvyash Agrotech Energy',
        driverId: drivers[1].id,
        insuranceExpiry: new Date('2026-08-15'),
        fitnessExpiry: new Date('2026-11-30'),
        permitExpiry: new Date('2027-01-15'),
      },
    }),
    prisma.vehicle.create({
      data: {
        vehicleNumber: 'MH-10-EF-9012',
        vehicleType: 'Truck',
        ownerName: 'External Transport',
        driverId: drivers[2].id,
        insuranceExpiry: new Date('2026-04-30'),
        fitnessExpiry: new Date('2026-05-15'),
        permitExpiry: new Date('2026-09-30'),
      },
    }),
  ]);
  console.log(`✅ ${vehicles.length} vehicles created`);

  // Create Sample Settings
  const settingsData = [
    { key: 'invoice_prefix', value: 'VAE/INV/' },
    { key: 'invoice_counter', value: '0' },
    { key: 'default_cgst_rate', value: '2.5' },
    { key: 'default_sgst_rate', value: '2.5' },
    { key: 'default_hsn_code', value: '4401' },
    { key: 'default_product', value: 'Biomass Briquettes' },
    { key: 'company_name', value: 'VISHVYASH AGROTECH ENERGY' },
    { key: 'company_gst', value: '27ABCFV1234A1Z5' },
    { key: 'company_pan', value: 'ABCFV1234A' },
    { key: 'company_state', value: 'Maharashtra' },
    { key: 'company_state_code', value: '27' },
    { key: 'company_address', value: 'Survey No. 57, At Post Borgaon (BK), Tal. Walwa, Dist. Sangli, Maharashtra - 415403' },
    { key: 'company_phone', value: '+91 9876543210' },
    { key: 'company_email', value: 'info@vishvyash.com' },
    { key: 'company_bank_name', value: 'State Bank of India' },
    { key: 'company_bank_account', value: '12345678901234' },
    { key: 'company_bank_ifsc', value: 'SBIN0001234' },
    { key: 'company_bank_branch', value: 'Walwa Branch' },
  ];

  await Promise.all(
    settingsData.map((setting) =>
      prisma.settings.upsert({
        where: { key: setting.key },
        update: {},
        create: setting,
      })
    )
  );
  console.log('✅ Settings created');

  // Create Sample Invoices
  const invoice1 = await prisma.invoice.create({
    data: {
      invoiceNumber: 'VAE/INV/0001',
      invoiceDate: new Date('2026-05-01'),
      clientId: clients[0].id,
      vehicleId: vehicles[0].id,
      driverId: drivers[0].id,
      transportType: 'By Road',
      buyerName: clients[0].name,
      buyerGst: clients[0].gstNumber,
      buyerAddress: clients[0].address,
      buyerState: 'Maharashtra',
      buyerStateCode: '27',
      subtotal: 50000,
      transportTotal: 5000,
      taxableAmount: 55000,
      cgstRate: 2.5,
      sgstRate: 2.5,
      cgstAmount: 1375,
      sgstAmount: 1375,
      grandTotal: 57750,
      amountInWords: 'Fifty Seven Thousand Seven Hundred Fifty Only',
      paidAmount: 57750,
      status: 'FINAL',
      createdBy: admin.id,
      items: {
        create: {
          description: 'Biomass Briquettes',
          hsnCode: '4401',
          quantity: 10,
          ratePerTon: 5000,
          amount: 50000,
          transportRate: 500,
          transportAmount: 5000,
          totalAmount: 55000,
        },
      },
    },
  });

  const invoice2 = await prisma.invoice.create({
    data: {
      invoiceNumber: 'VAE/INV/0002',
      invoiceDate: new Date('2026-05-10'),
      clientId: clients[1].id,
      vehicleId: vehicles[1].id,
      driverId: drivers[1].id,
      transportType: 'By Road',
      buyerName: clients[1].name,
      buyerGst: clients[1].gstNumber,
      buyerAddress: clients[1].address,
      buyerState: 'Maharashtra',
      buyerStateCode: '27',
      subtotal: 75000,
      transportTotal: 7500,
      taxableAmount: 82500,
      cgstRate: 2.5,
      sgstRate: 2.5,
      cgstAmount: 2062.5,
      sgstAmount: 2062.5,
      grandTotal: 86625,
      amountInWords: 'Eighty Six Thousand Six Hundred Twenty Five Only',
      paidAmount: 50000,
      status: 'FINAL',
      createdBy: admin.id,
      items: {
        create: {
          description: 'Biomass Briquettes',
          hsnCode: '4401',
          quantity: 15,
          ratePerTon: 5000,
          amount: 75000,
          transportRate: 500,
          transportAmount: 7500,
          totalAmount: 82500,
        },
      },
    },
  });

  const invoice3 = await prisma.invoice.create({
    data: {
      invoiceNumber: 'VAE/INV/0003',
      invoiceDate: new Date('2026-05-20'),
      clientId: clients[2].id,
      vehicleId: vehicles[2].id,
      driverId: drivers[2].id,
      transportType: 'By Road',
      buyerName: clients[2].name,
      buyerGst: clients[2].gstNumber,
      buyerAddress: clients[2].address,
      buyerState: 'Maharashtra',
      buyerStateCode: '27',
      subtotal: 100000,
      transportTotal: 10000,
      taxableAmount: 110000,
      cgstRate: 2.5,
      sgstRate: 2.5,
      cgstAmount: 2750,
      sgstAmount: 2750,
      grandTotal: 115500,
      amountInWords: 'One Lakh Fifteen Thousand Five Hundred Only',
      paidAmount: 0,
      status: 'FINAL',
      createdBy: admin.id,
      items: {
        create: {
          description: 'Biomass Briquettes',
          hsnCode: '4401',
          quantity: 20,
          ratePerTon: 5000,
          amount: 100000,
          transportRate: 500,
          transportAmount: 10000,
          totalAmount: 110000,
        },
      },
    },
  });
  console.log('✅ 3 sample invoices created');

  // Update settings counter
  await prisma.settings.update({
    where: { key: 'invoice_counter' },
    data: { value: '3' },
  });

  // Create sample payments
  await prisma.payment.create({
    data: {
      invoiceId: invoice1.id,
      clientId: clients[0].id,
      paymentDate: new Date('2026-05-05'),
      amount: 57750,
      paymentMode: 'NEFT',
      utrNumber: 'UTR202605050001',
      remarks: 'Full payment received',
      createdBy: admin.id,
    },
  });

  await prisma.payment.create({
    data: {
      invoiceId: invoice2.id,
      clientId: clients[1].id,
      paymentDate: new Date('2026-05-15'),
      amount: 50000,
      paymentMode: 'CHEQUE',
      chequeNumber: 'CHQ-001234',
      bankName: 'Bank of Maharashtra',
      remarks: 'Partial payment',
      createdBy: admin.id,
    },
  });
  console.log('✅ Sample payments created');

  console.log('🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
