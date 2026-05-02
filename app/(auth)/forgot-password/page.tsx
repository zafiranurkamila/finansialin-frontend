"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setIsSent(true);
      // Automatically redirect after a short delay
      setTimeout(() => {
        router.push(`/reset-password?email=${encodeURIComponent(email)}`);
      }, 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim permintaan reset password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="form-card" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Decorative accent */}
      <div style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        width: '100%', 
        height: '4px', 
        background: 'linear-gradient(90deg, #f1c74a, #d97706)' 
      }} />

      <div className="form-head">
        <p className="eyebrow" style={{ color: '#d97706' }}>Account Recovery</p>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Lupa Password?</h2>
        <p style={{ fontSize: '0.95rem' }}>Tenang, kami akan mengirimkan kode OTP 6 digit ke email Anda untuk mengatur ulang password.</p>
      </div>

      {!isSent ? (
        <form onSubmit={handleSubmit} style={{ marginTop: '12px' }}>
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

          <div className="form-actions" style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button 
              type="submit" 
              className="solid-button" 
              disabled={isLoading}
              style={{ width: '100%', height: '56px', borderRadius: '16px' }}
            >
              {isLoading ? 'Mengirim Kode...' : 'Kirim Kode OTP'}
            </button>
            
            <Link 
              href="/login" 
              style={{ 
                textAlign: 'center', 
                fontSize: '0.9rem', 
                color: '#666', 
                textDecoration: 'none',
                fontWeight: 600,
                marginTop: '8px'
              }}
            >
              Kembali ke Login
            </Link>
          </div>
        </form>
      ) : (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <div style={{ 
            width: '64px', 
            height: '64px', 
            background: '#f0fdf4', 
            borderRadius: '50%', 
            display: 'grid', 
            placeItems: 'center',
            margin: '0 auto 20px',
            color: '#16a34a'
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </div>
          <h3 style={{ margin: '0 0 8px', fontWeight: 700 }}>OTP Terkirim!</h3>
          <p style={{ color: '#666', fontSize: '0.9rem', lineHeight: 1.6 }}>
            Silakan cek email <strong>{email}</strong>.<br />
            Mengalihkan Anda ke halaman verifikasi...
          </p>
          <div style={{ 
            marginTop: '24px',
            height: '4px',
            background: '#eee',
            borderRadius: '2px',
            overflow: 'hidden'
          }}>
            <div style={{ 
              height: '100%', 
              background: '#16a34a', 
              width: '100%',
              animation: 'progress 2.5s linear forwards'
            }} />
          </div>
          <style>{`
            @keyframes progress {
              from { width: 0%; }
              to { width: 100%; }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
