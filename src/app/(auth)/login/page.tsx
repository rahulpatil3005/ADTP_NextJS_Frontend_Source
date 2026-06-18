'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth-store';
import { loginSchema, type LoginFormValues } from '@/lib/validators/schemas';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/primitives';
import { getErrorMessage } from '@/lib/api/client';

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register, handleSubmit, formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginFormValues) => {
    setLoading(true);
    setServerError(null);
    try {
      const { data } = await apiClient.post('/auth/login', values);
      setSession({
        accessToken: data.data.accessToken,
        refreshToken: data.data.refreshToken,
        userId: data.data.userId,
        role: data.data.role,
      });
      router.push('/dashboard');
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-sidebar-bg">
      {/* Left panel — dark brand */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center gap-8 px-12">
        <div className="flex flex-col items-center gap-6 text-center">
          <img
            src="/avishkar-logo.svg"
            alt="Avishkar Dhol Tasha Pathak"
            className="w-72 drop-shadow-2xl"
          />

          <div className="mt-2 h-px w-32 bg-gradient-to-r from-transparent via-gold to-transparent" />

          <p className="max-w-xs text-sm leading-relaxed text-white/50">
            Member management &amp; attendance tracking system for Avishkar Dhol Tasha Pathak.
          </p>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex w-full lg:w-1/2 flex-col items-center bg-background px-6 py-12">
        <div className="w-full max-w-sm">

          {/* Mobile logo banner */}
          <div className="mb-8 w-full lg:hidden">
            <div className="flex flex-col items-center gap-4 rounded-2xl bg-sidebar-bg px-6 py-8">
              <img
                src="/avishkar-logo.svg"
                alt="Avishkar Dhol Tasha Pathak"
                className="w-52 drop-shadow-xl"
              />
              <div className="h-px w-24 bg-gradient-to-r from-transparent via-gold to-transparent" />
              <p className="text-center text-xs text-white/50">
                Member management &amp; attendance tracking
              </p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-ink">Welcome back</h2>
            <p className="mt-1 text-sm text-ink-secondary">Sign in to manage your pathak</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <Label className="mb-1.5 block">Email address</Label>
              <Input {...register('email')} placeholder="admin@avishkardhtp.org" />
              {errors.email && <p className="mt-1 text-xs text-danger">{errors.email.message}</p>}
            </div>

            <div>
              <Label className="mb-1.5 block">Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-secondary hover:text-ink"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-danger">{errors.password.message}</p>}
            </div>

            {serverError && (
              <div className="rounded-md bg-danger/10 p-3 text-sm text-danger">{serverError}</div>
            )}

            <Button type="submit" className="w-full" loading={loading}>
              Sign In
            </Button>
          </form>

          {/* Gold bottom accent */}
          <div className="mt-10 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-ink-secondary">अविष्कार DHTP</span>
            <div className="h-px flex-1 bg-border" />
          </div>
        </div>
      </div>
    </div>
  );
}
