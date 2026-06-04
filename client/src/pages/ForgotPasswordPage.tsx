import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Leaf, Mail, KeyRound, Loader2, ArrowLeft, CheckCircle2, Phone } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [step, setStep] = useState<1 | 2>(1); // 1: Reset Password, 2: Success
  const [isLoading, setIsLoading] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !phone) {
      toast.error('Please fill in both email and registered phone number.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/auth/reset-password-direct', { email, phone, newPassword });
      toast.success('Password reset successfully!');
      setStep(2);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to reset password. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background items-center justify-center p-4">
      <div className="w-full max-w-md bg-card rounded-2xl border border-border shadow-lg p-8 relative overflow-hidden">
        {/* Decorative background shapes */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-xl" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-teal-500/10 rounded-full blur-xl" />

        {/* Branding header */}
        <div className="flex flex-col items-center mb-8 relative z-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-800 text-white mb-3">
            <Leaf className="h-6 w-6" />
          </div>
          <span className="font-extrabold tracking-wide text-md text-foreground">VISHVYASH</span>
          <span className="text-[10px] text-emerald-600 uppercase tracking-widest font-bold">Agrotech Energy</span>
        </div>

        {step === 1 && (
          <div className="space-y-6 relative z-10 text-xs">
            <div className="space-y-1.5 text-center">
              <h2 className="text-xl font-bold text-foreground">Reset Password</h2>
              <p className="text-xs text-muted-foreground">
                Verify identity using registered email and the <strong>10-digit phone number</strong> (exclude +91 or 0 prefix).
              </p>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">Registered 10-Digit Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                  <Input
                    id="phone"
                    type="text"
                    placeholder="e.g. 9876543210 (10 digits)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-10"
                    maxLength={10}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full flex justify-center items-center gap-2" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Resetting Password...
                  </>
                ) : (
                  'Reset Password'
                )}
              </Button>
            </form>

            <div className="text-center">
              <Link to="/login" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 relative z-10 text-center">
            <div className="flex justify-center">
              <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10" />
              </div>
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-foreground">Password Reset Complete</h2>
              <p className="text-sm text-muted-foreground">
                Your password has been changed successfully. You can now use your new password to sign in.
              </p>
            </div>

            <Button onClick={() => navigate('/login')} className="w-full">
              Back to Sign In
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
