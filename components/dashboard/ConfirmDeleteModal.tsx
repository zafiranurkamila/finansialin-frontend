"use client";

import { useState } from 'react';

type Props = {
  open: boolean;
  title: string;
  message: string;
  loading?: boolean;
  error?: string;
  onClose: () => void;
  onConfirm: (password: string) => Promise<void> | void;
};

export function ConfirmDeleteModal({
  open,
  title,
  message,
  loading = false,
  error = '',
  onClose,
  onConfirm,
}: Props) {
  const [password, setPassword] = useState('');

  if (!open) return null;

  return (
    <div className="modal-backdrop" style={{ zIndex: 9999 }}>
      <section className="modal-card" style={{ maxWidth: '440px', border: '1px solid #fee2e2' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ 
            width: '64px', 
            height: '64px', 
            background: '#fee2e2', 
            borderRadius: '50%', 
            display: 'grid', 
            placeItems: 'center',
            margin: '0 auto 16px',
            color: '#ef4444'
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/></svg>
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111', margin: '0 0 8px' }}>{title}</h2>
          <p style={{ color: '#666', fontSize: '0.95rem', lineHeight: 1.5 }}>{message}</p>
        </div>

        <div className="modal-form">
          <label className="field modal-field">
            <span style={{ fontWeight: 600 }}>Konfirmasi Password</span>
            <input
              type="password"
              placeholder="Masukkan password Anda"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ border: '2px solid #fee2e2' }}
              autoFocus
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

        <div className="modal-actions" style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <button type="button" className="text-button" onClick={onClose} style={{ height: '52px', border: '1px solid #eee', borderRadius: '14px' }}>
            Batal
          </button>
          <button 
            type="button" 
            className="solid-button" 
            onClick={() => onConfirm(password)} 
            disabled={loading || !password}
            style={{ height: '52px', background: '#ef4444', color: 'white', borderRadius: '14px' }}
          >
            {loading ? 'Menghapus...' : 'Ya, Hapus'}
          </button>
        </div>
      </section>
    </div>
  );
}
