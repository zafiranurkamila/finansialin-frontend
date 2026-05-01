"use client";

import { useRouter } from 'next/navigation';
import type { KeyboardEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { BrandLogo } from '@/components/BrandLogo';
import { FundingSourceWizard, type FundingSourceDraft } from '@/components/funding/FundingSourceWizard';
import { apiRequest, setStoredAuthTokens, type AuthTokens, type FundingSourceRecord } from '@/lib/api';

type Mode = 'welcome' | 'login' | 'register' | 'otp-register' | 'otp-login' | 'success';

type AuthResponse = {
  accessToken?: string;
  access_token?: string;
  refreshToken?: string;
  refresh_token?: string;
  requiresTwoFactor?: boolean;
  requiresRegistrationVerification?: boolean;
  twoFactorToken?: string;
  user?: {
    name?: string;
    email?: string;
  };
  message?: string;
};

const welcomeText = 'Selamat datang di Finansialin';
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

async function upsertFundingSource(name: string, initialBalance: string) {
  const balanceValue = Number(initialBalance || 0);
  const existingSources = await apiRequest<FundingSourceRecord[]>('/funding-sources');
  const existing = existingSources.find((source) => source.name.toLowerCase() === name.toLowerCase());

  if (existing) {
    return apiRequest<FundingSourceRecord>(`/funding-sources/${existing.idFundingSource}`, {
      method: 'PUT',
      body: JSON.stringify({
        name,
        initialBalance: balanceValue,
      }),
    });
  }

  return apiRequest<FundingSourceRecord>('/funding-sources', {
    method: 'POST',
    body: JSON.stringify({
      name,
      initialBalance: balanceValue,
    }),
  });
}

export function FinansialinOnboarding() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('welcome');
  const [authFlow, setAuthFlow] = useState<'login' | 'register' | null>(null);
  const [typedText, setTypedText] = useState('');
  const [showActions, setShowActions] = useState(false);
  const [otpValues, setOtpValues] = useState<string[]>(Array.from({ length: otpLength }, () => ''));
  const [selectedEmail, setSelectedEmail] = useState('');
  const [selectedName, setSelectedName] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [pendingTwoFactorToken, setPendingTwoFactorToken] = useState('');
  const [walletSetupOpen, setWalletSetupOpen] = useState(false);
  const [walletSetupLoading, setWalletSetupLoading] = useState(false);
  const [walletSetupError, setWalletSetupError] = useState('');
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (typedText.length >= welcomeText.length) {
      setShowActions(true);
      return;
    }

    const timeout = window.setTimeout(() => {
      setTypedText(welcomeText.slice(0, typedText.length + 1));
    }, 70);

    return () => window.clearTimeout(timeout);
  }, [typedText]);

  const resetOtp = () => {
    setOtpValues(Array.from({ length: otpLength }, () => ''));
  };

  const startLogin = () => {
    setAuthFlow('login');
    setMode('login');
    setSelectedName('');
    setSelectedEmail('');
    setAuthError('');
    resetOtp();
  };

  const startRegister = () => {
    setAuthFlow('register');
    setMode('register');
    setSelectedName('');
    setSelectedEmail('');
    setAuthError('');
    resetOtp();
  };

  const openWalletSetup = (name?: string, email?: string) => {
    setSelectedName(name ?? '');
    setSelectedEmail(email ?? '');
    setMode('success');
    setWalletSetupError('');
    setWalletSetupOpen(true);
  };

  const completeAuth = (response: AuthResponse, fallbackName?: string, fallbackEmail?: string) => {
    const tokens = resolveTokens(response);

    if (tokens) {
      setStoredAuthTokens(tokens);
    }

    if (authFlow === 'register') {
      openWalletSetup(response.user?.name ?? fallbackName, response.user?.email ?? fallbackEmail);
      return;
    }

    setWalletSetupOpen(false);
    router.push('/dashboard');
  };

  const submitAuth = async (endpoint: '/auth/login' | '/auth/register', payload: Record<string, string>, isRegistrationVerification?: boolean) => {
    setAuthLoading(true);
    setAuthError('');

    try {
      const response = await apiRequest<AuthResponse>(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // For registration, check if it requires verification
      if (authFlow === 'register') {
        if (response.requiresRegistrationVerification) {
          setSelectedName(payload.name);
          setSelectedEmail(payload.email);
          setMode('otp-register');
          resetOtp();
          window.requestAnimationFrame(() => {
            otpRefs.current[0]?.focus();
          });
          return;
        }
        completeAuth(response, payload.name, payload.email);
        return;
      }

      // For login, only show OTP if required by backend
      if (response.requiresTwoFactor && response.twoFactorToken) {
        setPendingTwoFactorToken(response.twoFactorToken);
        setMode('otp-login');
        window.requestAnimationFrame(() => {
          otpRefs.current[0]?.focus();
        });
        return;
      }

      completeAuth(response, payload.name, payload.email);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Gagal memproses autentikasi.');
    } finally {
      setAuthLoading(false);
    }
  };

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

  const handleOtpSubmit = async (isRegistrationFlow?: boolean) => {
      if (!otpComplete) {
        return;
      }

      // For login 2FA we require a pending two-factor token; for registration verification it's not required
      if (mode === 'otp-login' && !pendingTwoFactorToken) {
        return;
      }

    setAuthLoading(true);
    setAuthError('');

    try {
      const otpCode = otpValues.join('');

      // For registration verification, use different endpoint and payload
      if (isRegistrationFlow || mode === 'otp-register') {
        const response = await apiRequest<AuthResponse>('/auth/register/verify', {
          method: 'POST',
          body: JSON.stringify({
            email: selectedEmail,
            code: otpCode,
          }),
        });

        // After successful registration verification, check for 2FA
        if (response.requiresTwoFactor && response.twoFactorToken) {
          setPendingTwoFactorToken(response.twoFactorToken);
          setMode('otp-login');
          resetOtp();
          window.requestAnimationFrame(() => {
            otpRefs.current[0]?.focus();
          });
          return;
        }

        completeAuth(response, selectedName, selectedEmail);
        return;
      }

      // For login 2FA verification
      const response = await apiRequest<AuthResponse>('/auth/2fa/verify-login', {
        method: 'POST',
        authToken: pendingTwoFactorToken,
        body: JSON.stringify({
          code: otpCode,
        }),
      });

      completeAuth(response, selectedName, selectedEmail);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'OTP verification failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleWalletSetupSubmit = async (items: FundingSourceDraft[]) => {
    setWalletSetupLoading(true);
    setWalletSetupError('');

    try {
      for (const item of items) {
        if (!item.name.trim()) {
          continue;
        }

        await upsertFundingSource(item.name.trim(), item.initialBalance);
      }

      setWalletSetupOpen(false);
      setAuthFlow(null);
      // navigate to dashboard and refresh to ensure new data is fetched
      await router.push('/dashboard');
      try {
        // router.refresh() forces a refetch in Next.js app router
        // use optional chaining in case not available in older environments
        (router as any).refresh?.();
      } catch {
        // fallback: full reload
        window.location.assign('/dashboard');
      }
    } catch (error) {
      setWalletSetupError(error instanceof Error ? error.message : 'Gagal menyimpan dompet.');
    } finally {
      setWalletSetupLoading(false);
    }
  };

  const renderAuthPanel = () => {
    if (mode === 'welcome') {
      return (
        <div className="action-shell">
          <div className="welcome-copy">
            <p className="eyebrow">Personal finance dashboard</p>
            <h1 className="hero-title">Finansialin</h1>
            <p className="hero-subtitle">Bangun kebiasaan finansial yang lebih rapi, modern, dan mudah dipakai.</p>
          </div>

          <div className="action-row">
            <button type="button" className="ghost-button" onClick={startLogin} style={{ color: '#d4a017', borderColor: '#d4a017' }}>
              Login
            </button>
            <button type="button" className="solid-button" onClick={startRegister}>
              Register
            </button>
          </div>
        </div>
      );
    }

    if (mode === 'login') {
      return (
        <form
          className="form-card"
          onSubmit={async (event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            await submitAuth('/auth/login', {
              email: String(formData.get('email') ?? ''),
              password: String(formData.get('password') ?? ''),
            });
          }}
        >
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
            <button type="button" className="text-button" onClick={() => setMode('welcome')}>
              Kembali
            </button>
            <button type="submit" className="solid-button" disabled={authLoading}>
              {authLoading ? 'Memproses...' : 'Login'}
            </button>
          </div>
        </form>
      );
    }

    if (mode === 'register') {
      return (
        <form
          className="form-card"
          onSubmit={async (event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            await submitAuth('/auth/register', {
              name: String(formData.get('name') ?? ''),
              email: String(formData.get('email') ?? ''),
              password: String(formData.get('password') ?? ''),
            });
          }}
        >
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
            <button type="button" className="text-button" onClick={() => setMode('welcome')}>
              Kembali
            </button>
            <button type="submit" className="solid-button" disabled={authLoading}>
              {authLoading ? 'Memproses...' : 'Register'}
            </button>
          </div>
        </form>
      );
    }

    if (mode === 'otp-register' || mode === 'otp-login') {
      const isRegistration = mode === 'otp-register';
      return (
        <div className="otp-card">
          <div className="form-head">
            <p className="eyebrow">Verification</p>
            <h2>{isRegistration ? 'Verifikasi Email' : 'Masukkan OTP Code'}</h2>
            <p>
              {isRegistration 
                ? `Masukkan kode verifikasi yang telah dikirim ke ${selectedEmail || 'email kamu'}.`
                : `Kode verifikasi sudah dikirim ke ${selectedEmail || 'email kamu'}. ${selectedName ? `Akun: ${selectedName}.` : ''}`
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
            <button type="button" className="text-button" onClick={() => setMode('welcome')}>
              Batal
            </button>
            <button
              type="button"
              className="solid-button"
              disabled={!otpComplete || authLoading}
              onClick={() => handleOtpSubmit(isRegistration)}
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

    return (
      <div className="success-card">
        <BrandLogo compact className="form-brand" />
        <div className="badge">Verified</div>
        <h2>Login berhasil</h2>
        <p>Selanjutnya isi dompet utama dulu. Setelah disimpan, kamu akan masuk ke dashboard.</p>
        <div className="success-actions">
          <button type="button" className="text-button" onClick={() => setMode('welcome')}>
            Kembali ke awal
          </button>
          <button type="button" className="solid-button" onClick={() => setWalletSetupOpen(true)}>
            Isi dompet
          </button>
        </div>
      </div>
    );
  };

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div className="hero-visual">
          <div className="orb orb-one" />
          <div className="orb orb-two" />
          <div className="stats-card">
            <span className="stats-label">Dashboard ringkas</span>
            <strong>Rp 5.250.000</strong>
            <span className="stats-note">Saldo tersedia + gaji masuk</span>
          </div>
          <div className="stats-card floating-card">
            <span className="stats-label">Insight</span>
            <strong>Budget aman</strong>
            <span className="stats-note">Pos pengeluaran masih terkendali</span>
          </div>
        </div>

        <div className="hero-panel">
          <BrandLogo />

          <div className="typing-box">
            <p className="typing-text">{typedText}</p>
            {showActions ? <span className="typing-cursor" aria-hidden="true" /> : null}
          </div>

          <p className="supporting-copy">
            Hai {selectedName || 'Pengguna'}.
          </p>

          {renderAuthPanel()}
        </div>
      </section>

      <FundingSourceWizard
        open={walletSetupOpen}
        title="Isi dompet utama dulu"
        description="Masukkan MBanking, E Money, dan Cash sebelum dashboard dibuka."
        submitLabel="Simpan & masuk dashboard"
        loading={walletSetupLoading}
        onSubmit={handleWalletSetupSubmit}
      />

      {walletSetupError ? <p className="global-toast">{walletSetupError}</p> : null}
    </main>
  );
}
