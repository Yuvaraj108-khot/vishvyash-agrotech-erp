import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';

import authRoutes from './routes/auth';
import clientRoutes from './routes/clients';
import driverRoutes from './routes/drivers';
import vehicleRoutes from './routes/vehicles';
import invoiceRoutes from './routes/invoices';
import paymentRoutes from './routes/payments';
import dashboardRoutes from './routes/dashboard';
import reportRoutes from './routes/reports';
import searchRoutes from './routes/search';
import auditRoutes from './routes/audit';
import backupRoutes from './routes/backup';
import settingsRoutes from './routes/settings';
import userRoutes from './routes/users';
import { errorHandler } from './middleware/errorHandler';

const startupLogPath = process.env.STARTUP_LOG_PATH;

function writeServerStartupLog(message: string) {
  console.log(`[Server Log] ${message}`);
  if (startupLogPath) {
    try {
      const timestamp = new Date().toISOString();
      fs.appendFileSync(startupLogPath, `[${timestamp}] [Server] ${message}\n`);
    } catch (e: any) {
      console.error('Failed to write to startup log path:', e.message);
    }
  }
}

writeServerStartupLog(`Starting embedded server initialization...`);

writeServerStartupLog(`Loading dotenv config...`);
const dotenvResult = dotenv.config();
const dotenvPath = fs.existsSync(path.join(process.cwd(), '.env'))
  ? path.resolve(process.cwd(), '.env')
  : 'None (no local .env file found)';
writeServerStartupLog(`dotenv loaded. Path: ${dotenvPath}`);

// Sanitize DATABASE_URL if it has surrounding quotes
if (process.env.DATABASE_URL) {
  let dbUrl = process.env.DATABASE_URL.trim();
  if ((dbUrl.startsWith('"') && dbUrl.endsWith('"')) || (dbUrl.startsWith("'") && dbUrl.endsWith("'"))) {
    dbUrl = dbUrl.slice(1, -1);
  }
  process.env.DATABASE_URL = dbUrl;
}

writeServerStartupLog(`CONFIG DIAGNOSTICS:`);
writeServerStartupLog(`- app.config.json path: ${process.env.CONFIG_FILE_PATH || 'Not provided'}`);
writeServerStartupLog(`- config loaded successfully: ${!!process.env.CONFIG_FILE_PATH}`);
writeServerStartupLog(`- DATABASE_URL exists: ${!!process.env.DATABASE_URL}`);
writeServerStartupLog(`- ELECTRON_APP mode: ${process.env.ELECTRON_APP === 'true'}`);
writeServerStartupLog(`- PRISMA_QUERY_ENGINE_LIBRARY: ${process.env.PRISMA_QUERY_ENGINE_LIBRARY || 'Not provided'}`);

writeServerStartupLog(`Initializing Prisma Client...`);
let prisma: PrismaClient;
try {
  prisma = new PrismaClient();
  writeServerStartupLog(`Prisma Client initialized successfully.`);
} catch (e: any) {
  writeServerStartupLog(`CRITICAL ERROR during Prisma Client initialization: ${e.message}\nStack: ${e.stack}`);
  throw e;
}

const app = express();
const PORT = process.env.PORT || 4000;

writeServerStartupLog(`Testing database connection (prisma.$connect)...`);
prisma.$connect()
  .then(() => {
    writeServerStartupLog(`✅ Prisma connection successful! Database is online.`);
  })
  .catch((err: any) => {
    writeServerStartupLog(`❌ Prisma connection failed! Database is offline.`);
    writeServerStartupLog(`Prisma connection error details: ${err.message || err}\nStack: ${err.stack || 'No stack'}`);
  });
writeServerStartupLog(`Express app initial middleware setting up...`);

// Middleware — allow localhost, LAN IPs (192.168.x.x / 10.x.x.x), and Render
app.use(cors({
  origin: (origin, callback) => {
    if (
      !origin ||
      origin.startsWith('http://localhost:') ||
      origin.startsWith('file://') ||
      /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin) ||
      /^http:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/.test(origin) ||
      /^http:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+(:\d+)?$/.test(origin) ||
      origin.includes('onrender.com')
    ) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files for PDFs
app.use('/pdfs', express.static(path.join(__dirname, '../storage/pdfs')));
app.use('/backups', express.static(path.join(__dirname, '../storage/backups')));

// Serve built React client in production
// Compiled output: dist/src/index.js → __dirname = dist/src → ../../public = server/public
const PUBLIC_DIR = path.resolve(__dirname, '../../public');
const PUBLIC_INDEX = path.join(PUBLIC_DIR, 'index.html');

if (process.env.NODE_ENV === 'production') {
  if (fs.existsSync(PUBLIC_DIR)) {
    app.use(express.static(PUBLIC_DIR));
    console.log('📁 Serving React client from:', PUBLIC_DIR);
  } else {
    console.warn('⚠️  React public folder NOT found at:', PUBLIC_DIR);
    console.warn('   Run: cd client && npm run build && xcopy /E /I /Y dist ..\\server\\public');
  }
}

// Make prisma available on request
app.use((req, _res, next) => {
  (req as any).prisma = prisma;
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/users', userRoutes);

// Health check
writeServerStartupLog(`Registering health check endpoints...`);
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
writeServerStartupLog(`Health check endpoints registered.`);

// SPA fallback — serve React index.html for ALL non-API, non-file routes
// This must come AFTER all /api/* routes and BEFORE errorHandler
app.get(/.*/, (_req, res) => {
  if (fs.existsSync(PUBLIC_INDEX)) {
    // res.sendFile REQUIRES an absolute path
    res.sendFile(PUBLIC_INDEX);
  } else {
    res.status(200).json({ status: 'ok', message: 'Vishvyash ERP API is running. Build React client and copy to server/public.' });
  }
});

// Error handler (must be last)
app.use(errorHandler);

// Start server — bind to 0.0.0.0 so LAN office PCs can connect
writeServerStartupLog(`Starting Express server listening on port ${PORT}...`);
try {
  app.listen(Number(PORT), '0.0.0.0', () => {
    writeServerStartupLog(`🚀 Vishvyash Agrotech ERP Server running on http://0.0.0.0:${PORT}`);
    writeServerStartupLog(`   Local access:   http://localhost:${PORT}`);
    writeServerStartupLog(`   Network access: http://<SERVER_IP>:${PORT}`);
  });
} catch (e: any) {
  writeServerStartupLog(`CRITICAL ERROR during app.listen: ${e.message}\nStack: ${e.stack}`);
  throw e;
}


// Graceful shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

export { prisma };
export default app;
