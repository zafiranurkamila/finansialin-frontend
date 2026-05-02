"use client";

import { KeyboardEvent, useRef, useState } from 'react';
import { apiRequest, setStoredAuthTokens, type AuthTokens } from '@/lib/api';
import type { AuthResponse } from './types';
import { useRouter } from 'next/navigation';

type Props = {
  mode: 'otp-login' | 'otp-register';
  email: string;
  name?: string;
  pendingTwoFactorToken?: string;
  onCancel: () => void;
  onSuccess: (name?: string, email?: string) => void;
};

const otpLength = 6;

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

export function OtpPanel({ mode, email, name, pendingTwoFactorToken, onCancel, onSuccess }: Props) {
  const [otpValues, setOtpValues] = useState<string[]>(Array.from({ length: otpLength }, () => ''));
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const router = useRouter();

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) {
      return;
    }

    const nextValues = [...otpValues];
    nextValues[index] = value;
    setOtpValues(nextValues);

    if (value && index < otpLength - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !otpValues[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const otpComplete = otpValues.every((value) => value !== '') && otpValues.join('').length === otpLength;

  const handleOtpSubmit = async () => {
    if (!otpComplete) {
      return;
    }

    if (mode === 'otp-login' && !pendingTwoFactorToken) {
      return;
    }

    setAuthLoading(true);
    setAuthError('');

    try {
      const otpCode = otpValues.join('');
      let response: AuthResponse;

      if (mode === 'otp-register') {
        response = await apiRequest<AuthResponse>('/auth/register/verify', {
          method: 'POST',
          body: JSON.stringify({
            email,
            code: otpCode,
          }),
        });
        // We do not handle secondary 2FA here for simplicity, assuming registration verified.
      } else {
        response = await apiRequest<AuthResponse>('/auth/2fa/verify-login', {
          method: 'POST',
          authToken: pendingTwoFactorToken,
          body: JSON.stringify({
            code: otpCode,
          }),
        });
      }

      const tokens = resolveTokens(response);
      if (tokens) {
        setStoredAuthTokens(tokens);
      }

      onSuccess(response.user?.name ?? name, response.user?.email ?? email);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'OTP verification failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const isRegistration = mode === 'otp-register';

  return (
    <div className="otp-card">
      <div className="form-head">
        <p className="eyebrow">Verification</p>
        <h2>{isRegistration ? 'Verifikasi Email' : 'Masukkan OTP Code'}</h2>
        <p>
          {isRegistration 
            ? `Masukkan kode verifikasi yang telah dikirim ke ${email || 'email kamu'}.`
            : `Kode verifikasi sudah dikirim ke ${email || 'email kamu'}. ${name ? `Akun: ${name}.` : ''}`
          }
        </p>
      </div>

      <div className="otp-grid" role="group" aria-label="OTP Code">
        {otpValues.map((value, index) => (
          <input
            key={index}
            ref={(element) => {
              otpRefs.current[index] = element;
            }}
            className="otp-input"
            inputMode="numeric"
            maxLength={1}
            value={value}
            onChange={(event) => handleOtpChange(index, event.target.value)}
            onKeyDown={(event) => handleOtpKeyDown(index, event)}
            aria-label={`Digit OTP ${index + 1}`}
          />
        ))}
      </div>

      {authError ? <p className="modal-error">{authError}</p> : null}

      <div className="form-actions otp-actions">
        <button type="button" className="text-button" onClick={onCancel}>
          Batal
        </button>
        <button
          type="button"
          className="solid-button"
          disabled={!otpComplete || authLoading}
          onClick={handleOtpSubmit}
        >
          {authLoading ? 'Memverifikasi...' : 'Verifikasi'}
        </button>
      </div>

      <button type="button" className="link-button" onClick={() => alert('OTP dikirim ulang.')}>
        Kirim ulang kode
      </button>
    </div>
  );
}
