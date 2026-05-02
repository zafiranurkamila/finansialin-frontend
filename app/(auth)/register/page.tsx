"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest, setStoredAuthTokens, type AuthTokens } from '@/lib/api';
import type { AuthResponse } from '@/components/auth/types';
import { OtpPanel } from '@/components/auth/OtpPanel';
import { SuccessPanel } from '@/components/auth/SuccessPanel';

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

export default function RegisterPage() {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  
  const [step, setStep] = useState<'form' | 'otp' | 'success'>('form');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  const submitAuth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const inputName = String(formData.get('name') ?? '');
    const inputEmail = String(formData.get('email') ?? '');
    const password = String(formData.get('password') ?? '');

    setAuthLoading(true);
    setAuthError('');
    setName(inputName);
    setEmail(inputEmail);

    try {
      const response = await apiRequest<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name: inputName, email: inputEmail, password }),
      });

      if (response.requiresRegistrationVerification) {
        setStep('otp');
        return;
      }

      const tokens = resolveTokens(response);
      if (tokens) {
        setStoredAuthTokens(tokens);
      }
      setStep('success');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Gagal memproses pendaftaran.');
    } finally {
      setAuthLoading(false);
    }
  };

  if (step === 'success') {
    return <SuccessPanel onBack={() => router.push('/')} />;
  }

  if (step === 'otp') {
    return (
      <OtpPanel
        mode="otp-register"
        email={email}
        name={name}
        onCancel={() => setStep('form')}
        onSuccess={() => setStep('success')}
      />
    );
  }

  return (
    <form className="form-card" onSubmit={submitAuth}>
      <div className="form-head">
        <p className="eyebrow">Create account</p>
        <h2>Buat akun Finansialin</h2>
        <p>Isi data dulu, lalu lanjut ke OTP code untuk verifikasi.</p>
      </div>

      <label className="field">
        <span>Nama</span>
        <input name="name" type="text" placeholder="Nama lengkap" autoComplete="name" required />
      </label>

      <label className="field">
        <span>Email</span>
        <input name="email" type="email" placeholder="nama@email.com" autoComplete="email" required />
      </label>

      <label className="field">
        <span>Password</span>
        <input name="password" type="password" placeholder="Buat password" autoComplete="new-password" required />
      </label>

      {authError ? <p className="modal-error">{authError}</p> : null}

      <div className="form-actions">
        <button type="button" className="text-button" onClick={() => router.push('/')}>
          Kembali
        </button>
        <button type="submit" className="solid-button" disabled={authLoading}>
          {authLoading ? 'Memproses...' : 'Register'}
        </button>
      </div>
    </form>
  );
}
