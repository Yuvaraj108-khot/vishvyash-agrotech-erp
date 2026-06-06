import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
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

dotenv.config();

// Sanitize DATABASE_URL if it has surrounding quotes
if (process.env.DATABASE_URL) {
  let dbUrl = process.env.DATABASE_URL.trim();
  if ((dbUrl.startsWith('"') && dbUrl.endsWith('"')) || (dbUrl.startsWith("'") && dbUrl.endsWith("'"))) {
    dbUrl = dbUrl.slice(1, -1);
  }
  process.env.DATABASE_URL = dbUrl;
}

console.log("DATABASE_URL starts with:", process.env.DATABASE_URL?.slice(0, 20));

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin.startsWith('http://localhost:') || origin.includes('onrender.com')) {
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
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Vishvyash Agrotech ERP Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

export { prisma };
export default app;
