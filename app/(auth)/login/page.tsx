"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest, setStoredAuthTokens, type AuthTokens } from '@/lib/api';
import type { AuthResponse } from '@/components/auth/types';
import { OtpPanel } from '@/components/auth/OtpPanel';

function resolveTokens(response: AuthResponse): AuthTokens | null {
  const accessToken = response.accessToken ?? response.access_token;
  if (!accessToken) {
    return null;
  }
  return {
    accessToken,
    refreshToken: response.refreshToken ?? response.refresh_token,
  };
}

export default function LoginPage() {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  
  const [showOtp, setShowOtp] = useState(false);
  const [pendingTwoFactorToken, setPendingTwoFactorToken] = useState('');
  const [email, setEmail] = useState('');

  const submitAuth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const inputEmail = String(formData.get('email') ?? '');
    const password = String(formData.get('password') ?? '');

    setAuthLoading(true);
    setAuthError('');
    setEmail(inputEmail);

    try {
      const response = await apiRequest<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: inputEmail, password }),
      });

      if (response.requiresTwoFactor && response.twoFactorToken) {
        setPendingTwoFactorToken(response.twoFactorToken);
        setShowOtp(true);
        return;
      }

      const tokens = resolveTokens(response);
      if (tokens) {
        setStoredAuthTokens(tokens);
      }
      router.push('/dashboard');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Gagal memproses autentikasi.');
    } finally {
      setAuthLoading(false);
    }
  };

  if (showOtp) {
    return (
      <OtpPanel
        mode="otp-login"
        email={email}
        pendingTwoFactorToken={pendingTwoFactorToken}
        onCancel={() => setShowOtp(false)}
        onSuccess={() => router.push('/dashboard')}
      />
    );
  }

  return (
    <form className="form-card" onSubmit={submitAuth}>
      <div className="form-head">
        <p className="eyebrow">Welcome back</p>
        <h2>Login ke akunmu</h2>
        <p>Masukkan email dan password untuk lanjut ke verifikasi OTP.</p>
      </div>

      <label className="field">
        <span>Email</span>
        <input name="email" type="email" placeholder="nama@email.com" autoComplete="email" required />
      </label>

      <label className="field">
        <span>Password</span>
        <input name="password" type="password" placeholder="••••••••" autoComplete="current-password" required />
      </label>

      {authError ? <p className="modal-error">{authError}</p> : null}

      <div className="form-actions">
        <button type="button" className="text-button" onClick={() => router.push('/')}>
          Kembali
        </button>
        <button type="submit" className="solid-button" disabled={authLoading}>
          {authLoading ? 'Memproses...' : 'Login'}
        </button>
      </div>
    </form>
  );
}
