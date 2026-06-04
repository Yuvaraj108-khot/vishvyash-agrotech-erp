import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Leaf, Lock, Mail, Loader2, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
      toast.success('Successfully logged in!');
      navigate('/');
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left Column: Premium Branding Content */}
      <div className="hidden lg:flex flex-1 flex-col justify-between bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-950 p-12 text-white relative overflow-hidden">
        {/* Subtle background circles for depth */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-500/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3" />

        <div className="flex items-center gap-3 relative z-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md border border-white/20 overflow-hidden p-1">
            <img src="/logo.png" alt="Vishvyash Logo" className="h-full w-full object-contain drop-shadow-md" />
          </div>
          <div>
            <span className="font-extrabold tracking-wide text-lg">VISHVYASH</span>
            <span className="block text-[10px] text-emerald-400 uppercase tracking-widest font-semibold">Agrotech Energy</span>
          </div>
        </div>

        <div className="my-auto max-w-lg relative z-10 space-y-6">
          <h1 className="text-4xl font-extrabold tracking-tight leading-none xl:text-5xl">
            Biomass Briquette <br />
            <span className="text-emerald-400">ERP & Production Portal</span>
          </h1>
          <p className="text-emerald-200/80 leading-relaxed text-sm xl:text-base">
            Streamline supply chain logistics, print invoices, manage clients, vehicles, and track drivers for sustainable energy manufacturing.
          </p>
          <div className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
              <Leaf className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Eco-friendly Energy Production</p>
              <p className="text-xs text-emerald-300/70">Converting agricultural waste into high-efficiency green energy.</p>
            </div>
          </div>
        </div>

        <div className="text-xs text-emerald-400/60 relative z-10 flex flex-col gap-1">
          <span>&copy; {new Date().getFullYear()} Vishvyash Agrotech Energy. All rights reserved.</span>
          <span className="text-emerald-400/80 font-medium">Developed by Yuvaraj Khot</span>
        </div>
      </div>

      {/* Right Column: Login Form */}
      <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-800/10 border border-emerald-800/20 overflow-hidden p-1">
              <img src="/logo.png" alt="Vishvyash Logo" className="h-full w-full object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-foreground">VISHVYASH</span>
              <span className="text-[9px] text-muted-foreground uppercase font-semibold">Agrotech Energy</span>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Sign In</h2>
            <p className="text-sm text-muted-foreground">
              Enter your credentials to access the ERP platform.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full flex items-center justify-center gap-2 group"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
