"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';

type Step = 'EMAIL' | 'OTP' | 'PASSWORD' | 'SUCCESS';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('EMAIL');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setStep('OTP');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim permintaan reset password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError('Kode OTP harus 6 digit.');
      return;
    }
    
    setIsLoading(true);
    setError('');

    try {
      await apiRequest('/auth/forgot-password/verify', {
        method: 'POST',
        body: JSON.stringify({ email, code }),
      });
      setStep('PASSWORD');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kode OTP tidak valid atau sudah kadaluwarsa.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak cocok.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await apiRequest('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ 
          email, 
          code, 
          password 
        }),
      });
      setStep('SUCCESS');
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mereset password. Pastikan kode OTP benar.');
      // If OTP is invalid, we might want to go back to OTP step? 
      // But for now let's just show error.
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'EMAIL':
        return (
          <>
            <div className="form-head">
              <p className="eyebrow" style={{ color: '#d97706' }}>Account Recovery • Step 1/3</p>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Lupa Password?</h2>
              <p style={{ fontSize: '0.95rem' }}>Masukkan email Anda. Kami akan mengirimkan kode OTP 6 digit untuk mengatur ulang password.</p>
            </div>
            <form onSubmit={handleSendOtp} style={{ marginTop: '12px' }}>
              <label className="field">
                <span style={{ fontWeight: 600 }}>Email Terdaftar</span>
                <input 
                  type="email" 
                  placeholder="nama@email.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                  style={{ 
                    height: '56px',
                    fontSize: '1rem',
                    border: '2px solid rgba(0,0,0,0.05)',
                    background: '#fff'
                  }}
                />
              </label>

              {error && <ErrorAlert message={error} />}

              <div className="form-actions" style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button 
                  type="submit" 
                  className="solid-button" 
                  disabled={isLoading}
                  style={{ width: '100%', height: '56px', borderRadius: '16px' }}
                >
                  {isLoading ? 'Mengirim Kode...' : 'Kirim Kode OTP'}
                </button>
                <Link href="/login" style={backToLoginStyle}>Kembali ke Login</Link>
              </div>
            </form>
          </>
        );

      case 'OTP':
        return (
          <>
            <div className="form-head">
              <p className="eyebrow" style={{ color: '#d97706' }}>Verification • Step 2/3</p>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Masukkan OTP</h2>
              <p style={{ fontSize: '0.95rem' }}>Kode telah dikirim ke <strong>{email}</strong>. Silakan masukkan 6 digit kode tersebut.</p>
            </div>
            <form onSubmit={handleVerifyOtp} style={{ marginTop: '12px' }}>
              <label className="field">
                <span style={{ fontWeight: 600 }}>Kode OTP</span>
                <input 
                  type="text" 
                  placeholder="000000"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  required 
                  style={{ 
                    letterSpacing: '8px', 
                    fontWeight: '800', 
                    textAlign: 'center', 
                    fontSize: '1.4rem',
                    height: '64px',
                    border: '2px solid #f1c74a'
                  }}
                />
              </label>

              {error && <ErrorAlert message={error} />}

              <div className="form-actions" style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button 
                  type="submit" 
                  className="solid-button" 
                  disabled={isLoading}
                  style={{ width: '100%', height: '56px', borderRadius: '16px' }}
                >
                  {isLoading ? 'Memverifikasi...' : 'Verifikasi Kode'}
                </button>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', fontSize: '0.85rem', color: '#666' }}>
                  <span>Tidak menerima kode?</span>
                  <button 
                    type="button" 
                    onClick={handleSendOtp}
                    disabled={isLoading}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: '#d97706', 
                      fontWeight: 700, 
                      cursor: 'pointer',
                      padding: 0,
                      textDecoration: 'underline'
                    }}
                  >
                    Kirim Ulang
                  </button>
                </div>
                <button 
                  type="button" 
                  onClick={() => setStep('EMAIL')}
                  style={{ ...backToLoginStyle, background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Ganti Email
                </button>
              </div>
            </form>
          </>
        );

      case 'PASSWORD':
        return (
          <>
            <div className="form-head">
              <p className="eyebrow" style={{ color: '#d97706' }}>Secure Reset • Step 3/3</p>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Password Baru</h2>
              <p style={{ fontSize: '0.95rem' }}>Buat password baru yang kuat untuk akun Anda.</p>
            </div>
            <form onSubmit={handleResetPassword} style={{ marginTop: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                <label className="field">
                  <span style={{ fontWeight: 600 }}>Password Baru</span>
                  <input 
                    type="password" 
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required 
                    style={{ height: '56px' }}
                  />
                </label>

                <label className="field">
                  <span style={{ fontWeight: 600 }}>Konfirmasi Password</span>
                  <input 
                    type="password" 
                    placeholder="••••••••" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required 
                    style={{ height: '56px' }}
                  />
                </label>
              </div>

              {error && <ErrorAlert message={error} />}

              <div className="form-actions" style={{ marginTop: '32px' }}>
                <button 
                  type="submit" 
                  className="solid-button" 
                  disabled={isLoading}
                  style={{ width: '100%', height: '56px', borderRadius: '16px' }}
                >
                  {isLoading ? 'Memperbarui...' : 'Simpan Password'}
                </button>
              </div>
            </form>
          </>
        );

      case 'SUCCESS':
        return (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ 
              width: '72px', 
              height: '72px', 
              background: '#f0fdf4', 
              borderRadius: '50%', 
              display: 'grid', 
              placeItems: 'center',
              margin: '0 auto 24px',
              color: '#16a34a'
            }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 12px' }}>Berhasil!</h3>
            <p style={{ color: '#666', fontSize: '1rem', lineHeight: 1.6 }}>
              Password Anda telah berhasil diperbarui.<br />
              Mengalihkan Anda ke halaman login...
            </p>
            <div style={{ 
              marginTop: '32px',
              height: '6px',
              background: '#eee',
              borderRadius: '3px',
              overflow: 'hidden'
            }}>
              <div style={{ 
                height: '100%', 
                background: '#16a34a', 
                width: '100%',
                animation: 'progress 3s linear forwards'
              }} />
            </div>
            <style>{`
              @keyframes progress {
                from { width: 0%; }
                to { width: 100%; }
              }
            `}</style>
          </div>
        );
    }
  };

  return (
    <div className="form-card" style={{ position: 'relative', overflow: 'hidden', minHeight: '480px', transition: 'all 0.3s ease' }}>
      {/* Decorative accent */}
      <div style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        width: '100%', 
        height: '4px', 
        background: 'linear-gradient(90deg, #f1c74a, #d97706)' 
      }} />

      {renderStep()}
    </div>
  );
}

function ErrorAlert({ message }: { message: string }) {
  return (
    <div style={{ 
      marginTop: '16px', 
      padding: '12px', 
      borderRadius: '10px', 
      background: '#fef2f2', 
      color: '#991b1b', 
      fontSize: '0.88rem',
      fontWeight: 500,
      border: '1px solid #fecaca'
    }}>
      {message}
    </div>
  );
}

const backToLoginStyle: React.CSSProperties = {
  textAlign: 'center', 
  fontSize: '0.9rem', 
  color: '#666', 
  textDecoration: 'none',
  fontWeight: 600,
  marginTop: '8px'
};

