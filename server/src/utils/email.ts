import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendOTPEmail(to: string, otp: string, name: string): Promise<boolean> {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log(`📧 OTP for ${to}: ${otp} (Email not configured, printing to console)`);
      return true;
    }

    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Vishvyash Agrotech Energy" <noreply@vishvyash.com>',
      to,
      subject: 'Password Reset OTP - Vishvyash Agrotech Energy',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #166534, #15803d); padding: 20px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 20px;">VISHVYASH AGROTECH ENERGY</h1>
            <p style="color: #bbf7d0; margin: 5px 0 0;">ERP System</p>
          </div>
          <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px;">
            <p style="color: #374151;">Hello <strong>${name}</strong>,</p>
            <p style="color: #374151;">Your OTP for password reset is:</p>
            <div style="background: #166534; color: white; font-size: 32px; letter-spacing: 8px; text-align: center; padding: 15px; border-radius: 8px; margin: 20px 0;">
              ${otp}
            </div>
            <p style="color: #6b7280; font-size: 14px;">This OTP is valid for <strong>10 minutes</strong>.</p>
            <p style="color: #6b7280; font-size: 14px;">If you didn't request this, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">© Vishvyash Agrotech Energy</p>
          </div>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    console.log(`📧 OTP for ${to}: ${otp} (Fallback to console)`);
    return true; // Don't block password reset if email fails in dev
  }
}
