"use client";

import { BrandLogo } from '@/components/BrandLogo';
import { ReactNode, useEffect, useState } from 'react';

const welcomeText = 'Selamat datang di Finansialin';

export default function AuthLayout({ children }: { children: ReactNode }) {
  const [typedText, setTypedText] = useState('');
  const [showActions, setShowActions] = useState(false);

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
            Hai Pengguna.
          </p>

          {children}
        </div>
      </section>
    </main>
  );
}
