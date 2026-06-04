import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import { sendOTPEmail } from '../utils/email';

const router = Router();
const prisma = new PrismaClient();

// POST /api/auth/login
router.post('/login', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
      },
    });
  } catch (error: any) {
    console.error('Login error details:', error);
    res.status(500).json({ error: 'Login failed.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, email: true, name: true, role: true, phone: true, createdAt: true },
    });
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user.' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email is required.' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't reveal if user exists
      res.json({ message: 'If the email exists, an OTP has been sent.' });
      return;
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Invalidate old OTPs
    await prisma.passwordResetOtp.updateMany({
      where: { userId: user.id, isUsed: false },
      data: { isUsed: true },
    });

    // Save new OTP
    await prisma.passwordResetOtp.create({
      data: { userId: user.id, otp, expiresAt },
    });

    // Send email
    await sendOTPEmail(email, otp, user.name);

    res.json({ message: 'If the email exists, an OTP has been sent.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process request.' });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      res.status(400).json({ error: 'Email and OTP are required.' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(400).json({ error: 'Invalid OTP.' });
      return;
    }

    const otpRecord = await prisma.passwordResetOtp.findFirst({
      where: {
        userId: user.id,
        otp,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      res.status(400).json({ error: 'Invalid or expired OTP.' });
      return;
    }

    res.json({ message: 'OTP verified.', verified: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify OTP.' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      res.status(400).json({ error: 'Email, OTP, and new password are required.' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters.' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(400).json({ error: 'Invalid request.' });
      return;
    }

    const otpRecord = await prisma.passwordResetOtp.findFirst({
      where: {
        userId: user.id,
        otp,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!otpRecord) {
      res.status(400).json({ error: 'Invalid or expired OTP.' });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    await prisma.passwordResetOtp.update({
      where: { id: otpRecord.id },
      data: { isUsed: true },
    });

    res.json({ message: 'Password reset successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset password.' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Current and new passwords are required.' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      res.status(400).json({ error: 'Current password is incorrect.' });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    res.json({ message: 'Password changed successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to change password.' });
  }
});

// POST /api/auth/reset-password-direct
router.post('/reset-password-direct', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, phone, newPassword } = req.body;
    if (!email || !phone || !newPassword) {
      res.status(400).json({ error: 'Email, phone number, and new password are required.' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters.' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(404).json({ error: 'User not found with this email.' });
      return;
    }

    const cleanDbPhone = user.phone ? user.phone.replace(/\s+/g, '').replace(/[^0-9]/g, '') : '';
    const cleanInputPhone = phone.replace(/\s+/g, '').replace(/[^0-9]/g, '');

    const dbPhoneLast10 = cleanDbPhone.slice(-10);
    const inputPhoneLast10 = cleanInputPhone.slice(-10);

    if (!dbPhoneLast10 || dbPhoneLast10 !== inputPhoneLast10 || inputPhoneLast10.length !== 10) {
      res.status(400).json({ error: 'Verification failed. Registered 10-digit phone number is incorrect.' });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    res.json({ message: 'Password reset successfully.' });
  } catch (error) {
    console.error('Direct reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password.' });
  }
});

export default router;
