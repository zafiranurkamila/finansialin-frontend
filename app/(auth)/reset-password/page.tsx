"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak cocok.');
      return;
    }

    if (code.length !== 6) {
      setError('Kode OTP harus 6 digit.');
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
      
      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mereset password. Pastikan kode OTP benar.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="form-card" style={{ textAlign: 'center', padding: '40px 26px' }}>
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
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 12px' }}>Berhasil!</h2>
        <p style={{ color: '#666', lineHeight: 1.6, marginBottom: '24px' }}>
          Password Anda telah diperbarui. Silakan login kembali untuk mengakses dashboard Anda.
        </p>
        <div style={{ 
          background: '#f8f9fa', 
          padding: '14px', 
          borderRadius: '12px',
          fontSize: '0.9rem',
          color: '#444',
          fontWeight: 600
        }}>
          Mengalihkan ke halaman login...
        </div>
      </div>
    );
  }

  return (
    <div className="form-card" style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        width: '100%', 
        height: '4px', 
        background: 'linear-gradient(90deg, #f1c74a, #d97706)' 
      }} />

      <div className="form-head">
        <p className="eyebrow" style={{ color: '#d97706' }}>Secure Reset</p>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Atur Password Baru</h2>
        <p style={{ fontSize: '0.95rem' }}>Verifikasi identitas Anda dengan kode OTP dan buat password baru yang kuat.</p>
      </div>

      <form onSubmit={handleSubmit} style={{ marginTop: '16px' }}>
        <label className="field">
          <span style={{ fontWeight: 600 }}>Email</span>
          <input 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required 
            style={{ background: '#f9f9f9', cursor: 'not-allowed' }}
            readOnly
          />
        </label>

        <label className="field">
          <span style={{ fontWeight: 600 }}>Kode OTP (6 Digit)</span>
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <label className="field">
            <span style={{ fontWeight: 600 }}>Password Baru</span>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </label>

          <label className="field">
            <span style={{ fontWeight: 600 }}>Konfirmasi</span>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required 
            />
          </label>
        </div>

        {error ? (
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
            {error}
          </div>
        ) : null}

        <div className="form-actions" style={{ marginTop: '32px' }}>
          <button 
            type="submit" 
            className="solid-button" 
            disabled={isLoading}
            style={{ width: '100%', height: '56px', borderRadius: '16px' }}
          >
            {isLoading ? 'Memperbarui...' : 'Simpan Password Baru'}
          </button>
        </div>
        
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
           <Link href="/login" style={{ fontSize: '0.9rem', color: '#666', textDecoration: 'none', fontWeight: 600 }}>
             Batal dan kembali
           </Link>
        </div>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
